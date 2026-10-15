/**
 * Optional privileged Cloud Firestore access for the server.
 *
 * When FIREBASE_SERVICE_ACCOUNT holds a Firebase service-account key (the raw
 * JSON file contents, or that JSON base64-encoded), server-side Firestore REST
 * calls carry an OAuth2 access token. Requests authorised this way are checked
 * by IAM instead of firestore.rules, which is what allows `settings/*` to be
 * locked to browsers later without breaking account sync on Vercel (SQLite
 * lives in /tmp there, so Firestore is the only durable account store).
 *
 * Without the variable, or if the token exchange fails, callers get no extra
 * headers and keep using the public API key exactly as before.
 */
import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/datastore';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000;

let cachedAccount; // undefined = not read yet, null = not configured or invalid
let cachedToken = null; // { value, expiresAt }
let inflight = null;
let lastError = null;
let nextRetryAt = 0;

/** Parses a service-account key given as raw JSON or base64-encoded JSON. */
export function parseServiceAccount(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const json = text.startsWith('{') ? text : Buffer.from(text, 'base64').toString('utf8');
  try {
    const parsed = JSON.parse(json);
    const clientEmail = String(parsed.client_email || '').trim();
    // Keys pasted into dashboards sometimes keep literal "\n" sequences.
    const privateKey = String(parsed.private_key || '').replace(/\\n/g, '\n');
    if (!clientEmail || !privateKey.includes('PRIVATE KEY')) return null;
    return {
      clientEmail,
      privateKey,
      tokenUri: String(parsed.token_uri || DEFAULT_TOKEN_URI),
      projectId: parsed.project_id ? String(parsed.project_id) : null
    };
  } catch {
    return null;
  }
}

function getAccount() {
  if (cachedAccount === undefined) {
    cachedAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (process.env.FIREBASE_SERVICE_ACCOUNT && !cachedAccount) {
      lastError = 'invalid_service_account';
      console.warn('[firestoreAuth] FIREBASE_SERVICE_ACCOUNT is set but is not a valid service-account key.');
    }
  }
  return cachedAccount;
}

export function isServiceAccountConfigured() {
  return Boolean(getAccount());
}

/** Signed JWT used for the OAuth2 JWT-bearer grant (RFC 7523). */
export function buildSignedAssertion(account, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: account.clientEmail,
    scope: SCOPE,
    aud: account.tokenUri,
    iat: nowSeconds,
    exp: nowSeconds + 3600
  };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(claims)}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(account.privateKey);
  return `${unsigned}.${signature.toString('base64url')}`;
}

async function mintAccessToken(account) {
  const res = await fetch(account.tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: buildSignedAssertion(account)
    }).toString(),
    signal: AbortSignal.timeout(8000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.access_token !== 'string' || !data.access_token) {
    throw new Error(`token_exchange_failed (HTTP ${res.status}${data.error ? `, ${data.error}` : ''})`);
  }
  const ttlSeconds = Math.max(60, Number(data.expires_in) || 3600);
  return { value: data.access_token, expiresAt: Date.now() + ttlSeconds * 1000 };
}

/**
 * Headers to add to a Firestore REST request: `{ Authorization }` when a
 * service account is configured and a token is available, otherwise `{}`.
 */
export async function getFirestoreAuthHeaders() {
  const account = getAccount();
  if (!account) return {};
  if (cachedToken && cachedToken.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return { Authorization: `Bearer ${cachedToken.value}` };
  }
  if (Date.now() < nextRetryAt) return {};
  if (!inflight) {
    inflight = mintAccessToken(account)
      .then((token) => {
        cachedToken = token;
        lastError = null;
        return token;
      })
      .catch((err) => {
        lastError = err.message;
        nextRetryAt = Date.now() + RETRY_AFTER_FAILURE_MS;
        console.warn('[firestoreAuth]', err.message);
        return null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  const token = await inflight;
  return token ? { Authorization: `Bearer ${token.value}` } : {};
}

/**
 * Non-secret status for /api/health:
 * 'api_key' (not configured), 'invalid_key', 'service_account_pending',
 * 'service_account' (token obtained) or 'error' (token exchange failed).
 */
export function getFirestoreAuthStatus() {
  const account = getAccount();
  if (!account) return process.env.FIREBASE_SERVICE_ACCOUNT ? 'invalid_key' : 'api_key';
  if (cachedToken && cachedToken.expiresAt > Date.now()) return 'service_account';
  if (lastError) return 'error';
  return 'service_account_pending';
}

/** Test helper: forget the cached key and token. */
export function resetFirestoreAuthForTests() {
  cachedAccount = undefined;
  cachedToken = null;
  inflight = null;
  lastError = null;
  nextRetryAt = 0;
}
