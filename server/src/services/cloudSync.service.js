/**
 * Shared Cloud Sync Bridge between BLACK X Website & BLACK X Mobile 120Hz APK
 * Syncs users (including Google Sign-In users), profiles, favorites, watch progress,
 * and community posts via Firebase Cloud Firestore
 * (spry-oxide-1h7sp / ai-studio-blackxanime-e47e1ba2-315f-4c3b-8557-71352813f36c)
 */
import crypto from 'node:crypto';
import { db } from '../db.js';
import { publicUser } from '../auth.js';
import { getFirestoreAuthHeaders } from './firestoreAuth.js';

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

/**
 * Pull favorites & watch progress from Cloud Firestore into local SQLite for this user
 */
export async function mergeCloudLibraryToLocal(userRow, cloudData = null) {
  if (!userRow || !userRow.id) return;
  try {
    const cloud = cloudData || (await fetchUserFromCloud(userRow.email || userRow.username));
    if (!cloud) return;

    if (Array.isArray(cloud.favorites)) {
      const insertFav = db.prepare(`
        INSERT INTO favorites (user_id, slug, title_en, title_ar, poster, banner, episodes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, slug) DO UPDATE SET
          title_en = COALESCE(excluded.title_en, favorites.title_en),
          title_ar = COALESCE(excluded.title_ar, favorites.title_ar),
          poster = COALESCE(excluded.poster, favorites.poster),
          banner = COALESCE(excluded.banner, favorites.banner)
      `);
      for (const f of cloud.favorites) {
        const slug = String(f.slug || (f.objectID ? `aw-${String(f.objectID).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '')).trim();
        if (!slug) continue;
        insertFav.run(
          userRow.id,
          slug,
          f.titleEn || f.title_en || f.objectID || slug,
          f.titleAr || f.title_ar || f.titleEn || slug,
          f.poster || null,
          f.banner || f.poster || null,
          Number(f.episodes) || null
        );
      }
    }

    if (Array.isArray(cloud.progress)) {
      const insertProg = db.prepare(`
        INSERT INTO progress (user_id, slug, episode, position, duration, completed, title_en, title_ar, poster, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id, slug, episode) DO UPDATE SET
          title_en = COALESCE(excluded.title_en, progress.title_en),
          title_ar = COALESCE(excluded.title_ar, progress.title_ar),
          poster = COALESCE(excluded.poster, progress.poster)
      `);
      for (const p of cloud.progress) {
        const slug = String(p.slug || (p.objectID ? `aw-${String(p.objectID).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '')).trim();
        const ep = Number(p.episode) || 1;
        if (!slug) continue;
        insertProg.run(
          userRow.id,
          slug,
          ep,
          Number(p.position) || 0,
          Number(p.duration) || 1440,
          p.completed ? 1 : 0,
          p.titleEn || p.title_en || p.objectID || slug,
          p.titleAr || p.title_ar || p.titleEn || slug,
          p.poster || null
        );
      }
    }
  } catch (err) {
    console.warn('[cloudSync.mergeCloudLibraryToLocal]', err.message);
  }
}

export async function syncUserToCloud(userRow, rawPassword = null) {
  if (!userRow || !userRow.username) return;
  const pub = publicUser(userRow);

  // First pull any new favorites/progress from cloud so we never overwrite APK additions
  let existingCloud = null;
  try {
    existingCloud = (await fetchUserFromCloud(userRow.email)) || (await fetchUserFromCloud(userRow.username));
    if (existingCloud) {
      await mergeCloudLibraryToLocal(userRow, existingCloud);
    }
  } catch (_) {}

  // Read merged favorites and watch progress from SQLite (`favorites` & `progress` tables)
  let favorites = [];
  let progress = [];
  try {
    const favRows = db
      .prepare('SELECT slug, title_en, title_ar, poster, banner, episodes, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC LIMIT 120')
      .all(userRow.id);
    favorites = favRows.map((r) => ({
      slug: r.slug,
      objectID: r.title_en || r.slug,
      titleEn: r.title_en,
      titleAr: r.title_ar,
      poster: r.poster,
      banner: r.banner,
      episodes: r.episodes,
      createdAt: r.created_at
    }));

    const progRows = db
      .prepare('SELECT slug, episode, position, duration, completed, title_en, title_ar, poster, updated_at FROM progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 120')
      .all(userRow.id);
    progress = progRows.map((r) => ({
      slug: r.slug,
      objectID: r.title_en || r.slug,
      episode: r.episode,
      position: r.position,
      duration: r.duration,
      completed: r.completed,
      titleEn: r.title_en,
      titleAr: r.title_ar,
      poster: r.poster,
      updatedAt: r.updated_at
    }));
  } catch (_) {}

  const uKey = cleanDocKey('user', userRow.username);
  const eKey = userRow.email ? cleanDocKey('email', userRow.email) : null;

  const existingPassSha256 = rawPassword
    ? sha256Hex(rawPassword)
    : existingCloud?.passSha256 || '';

  const payloadObj = {
    id: String(userRow.id),
    username: String(userRow.username).toLowerCase(),
    email: String(userRow.email || '').toLowerCase(),
    displayName: pub.displayName || userRow.display_name || userRow.username,
    photoUrl: pub.photoUrl || userRow.photo_url || existingCloud?.photoUrl || '',
    avatarColor: pub.avatarColor || userRow.avatar_color || '#ffffff',
    bio: pub.bio || userRow.bio || '',
    role: pub.role || userRow.role || 'user',
    vipStatus: pub.vipStatus || userRow.vip_status || 'VIP Monarch',
    badges: Array.isArray(pub.badges) ? pub.badges : [],
    passSha256: existingPassSha256,
    isGoogleAccount: Boolean(userRow.email?.includes('@gmail.com') || existingCloud?.isGoogleAccount),
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
    // Service-account token when FIREBASE_SERVICE_ACCOUNT is set; {} otherwise.
    const writeHeaders = { 'Content-Type': 'application/json', ...(await getFirestoreAuthHeaders()) };
    await fetch(`${BASE_URL}/${uKey}?key=${API_KEY}`, {
      method: 'PATCH',
      headers: writeHeaders,
      body: JSON.stringify(firestoreDoc),
      signal: AbortSignal.timeout(8000)
    });
    if (eKey) {
      await fetch(`${BASE_URL}/${eKey}?key=${API_KEY}`, {
        method: 'PATCH',
        headers: writeHeaders,
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
      headers: { Accept: 'application/json', ...(await getFirestoreAuthHeaders()) },
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
