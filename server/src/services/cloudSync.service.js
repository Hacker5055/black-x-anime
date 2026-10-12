/**
 * Shared Cloud Sync Bridge between BLACK X Website & BLACK X Mobile 120Hz APK
 * Syncs users, profiles, favorites, watch progress, and community posts via Firebase Cloud Firestore
 * (spry-oxide-1h7sp / ai-studio-blackxanime-e47e1ba2-315f-4c3b-8557-71352813f36c)
 */
import crypto from 'node:crypto';
import { db } from '../db.js';
import { hashPassword, publicUser } from '../auth.js';

const PROJECT_ID = 'spry-oxide-1h7sp';
const DATABASE_ID = 'ai-studio-blackxanime-e47e1ba2-315f-4c3b-8557-71352813f36c';
const API_KEY = 'AIzaSyD4yG_ljN1S8TfwC33E4Z0o499MYC71eUE';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/settings`;

function cleanDocKey(prefix, val) {
  const safe = String(val || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '_');
  return `${prefix}_${safe}`.slice(0, 120);
}

export function sha256Hex(str) {
  return crypto.createHash('sha256').update(String(str || '')).digest('hex');
}

export async function syncUserToCloud(userRow, rawPassword = null) {
  if (!userRow || !userRow.username) return;
  const pub = publicUser(userRow);

  // Also read user's favorites and watch progress from SQLite
  let favorites = [];
  let progress = [];
  try {
    favorites = db
      .prepare('SELECT slug, title_en, title_ar, poster, banner, episodes, created_at FROM stream_favorites WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
      .all(userRow.id);
    progress = db
      .prepare('SELECT slug, episode, position, duration, completed, title_en, title_ar, poster, updated_at FROM stream_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100')
      .all(userRow.id);
  } catch (_) {}

  const uKey = cleanDocKey('user', userRow.username);
  const eKey = userRow.email ? cleanDocKey('email', userRow.email) : null;

  // Preserve existing passSha256 or cloud favorites if rawPassword not supplied
  let existingPassSha256 = rawPassword ? sha256Hex(rawPassword) : '';
  if (!existingPassSha256) {
    try {
      const existing = await fetchUserFromCloud(userRow.username);
      if (existing?.passSha256) existingPassSha256 = existing.passSha256;
    } catch (_) {}
  }

  const payloadObj = {
    id: String(userRow.id),
    username: String(userRow.username).toLowerCase(),
    email: String(userRow.email || '').toLowerCase(),
    displayName: pub.displayName || userRow.display_name || userRow.username,
    photoUrl: pub.photoUrl || userRow.photo_url || '',
    avatarColor: pub.avatarColor || userRow.avatar_color || '#22d3ee',
    bio: pub.bio || userRow.bio || '',
    role: pub.role || userRow.role || 'user',
    vipStatus: pub.vipStatus || userRow.vip_status || '',
    badges: Array.isArray(pub.badges) ? pub.badges : [],
    passSha256: existingPassSha256,
    favorites,
    progress,
    updatedAt: new Date().toISOString()
  };

  const firestoreDoc = {
    fields: {
      json: { stringValue: JSON.stringify(payloadObj) },
      username: { stringValue: payloadObj.username },
      email: { stringValue: payloadObj.email },
      updatedAt: { stringValue: payloadObj.updatedAt }
    }
  };

  try {
    await fetch(`${BASE_URL}/${uKey}?key=${API_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreDoc),
      signal: AbortSignal.timeout(8000)
    });
    if (eKey) {
      await fetch(`${BASE_URL}/${eKey}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreDoc),
        signal: AbortSignal.timeout(8000)
      });
    }
  } catch (err) {
    console.warn('[cloudSync.syncUserToCloud]', err.message);
  }
}

export async function fetchUserFromCloud(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).toLowerCase().trim();
  const isEmail = clean.includes('@');
  const docKey = isEmail ? cleanDocKey('email', clean) : cleanDocKey('user', clean);

  try {
    const res = await fetch(`${BASE_URL}/${docKey}?key=${API_KEY}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const rawJson = data?.fields?.json?.stringValue;
    if (!rawJson) return null;
    return JSON.parse(rawJson);
  } catch {
    return null;
  }
}

/**
 * Sync all existing local SQLite users to Cloud Firestore on server startup
 */
export async function syncAllLocalUsersToCloud() {
  try {
    const rows = db.prepare('SELECT * FROM users LIMIT 100').all();
    for (const row of rows) {
      await syncUserToCloud(row);
    }
  } catch (err) {
    console.warn('[cloudSync.syncAllLocalUsersToCloud]', err.message);
  }
}
