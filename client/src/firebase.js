import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/*
 * Firestore is loaded on first use, never at boot. The SDK (with its webchannel transport and the
 * re2js regex engine it bundles since firebase 13) is ~440 KB of JavaScript that guests on most
 * pages never need; it used to sit in the website's main chunk and every page load also ran a
 * "test connection" read. Everything below goes through loadFirestore().
 */
let firestoreReady = null;
export function loadFirestore() {
  if (!firestoreReady) {
    firestoreReady = import('firebase/firestore').then((fs) => ({
      fs,
      // CRITICAL: keep the named database id and long polling, the app breaks without them.
      db: fs.initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId)
    }));
    // A failed chunk download (offline, new deploy) can be retried on the next call.
    firestoreReady.catch(() => {
      firestoreReady = null;
    });
  }
  return firestoreReady;
}

/** onSnapshot that starts once Firestore has loaded; the returned function always unsubscribes. */
function deferredSnapshot(makeRef, onData, label) {
  let unsubscribe = null;
  let cancelled = false;
  loadFirestore()
    .then(({ fs, db }) => {
      if (cancelled) return;
      unsubscribe = fs.onSnapshot(makeRef(fs, db), onData, (error) => {
        console.warn(`${label}:`, error.message);
      });
    })
    .catch((err) => console.warn(`${label}:`, err?.message || err));
  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;

    // Check if a customized user profile document already exists in Firestore
    let store = null;
    try {
      store = await loadFirestore();
    } catch (err) {
      console.warn('Firestore unavailable (continuing sign-in):', err);
    }
    const userDocRef = store ? store.fs.doc(store.db, 'users', fbUser.uid) : null;
    let existingProfile = null;
    if (userDocRef) {
      try {
        const snap = await store.fs.getDoc(userDocRef);
        if (snap.exists()) {
          existingProfile = snap.data();
        }
      } catch (err) {
        console.warn('Could not read existing Firestore user doc:', err);
      }
    }

    const isDeveloper = fbUser.email?.toLowerCase() === 'mz0970mmz@gmail.com';

    // Preserve custom displayName and photoURL if already customized!
    const effectiveDisplayName = existingProfile?.displayName || fbUser.displayName || (isDeveloper ? 'Developer MZ' : 'Anime Fan');
    const effectivePhoto = existingProfile?.photoUrl || existingProfile?.photoURL || fbUser.photoURL || '';

    const userData = {
      id: fbUser.uid,
      email: fbUser.email || '',
      displayName: effectiveDisplayName,
      photoURL: effectivePhoto,
      photoUrl: effectivePhoto,
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existingProfile?.username) userData.username = existingProfile.username;
    if (existingProfile?.bio) userData.bio = existingProfile.bio;
    if (existingProfile?.avatarColor) userData.avatarColor = existingProfile.avatarColor;
    if (isDeveloper || existingProfile?.role === 'developer') userData.role = 'developer';
    if (existingProfile?.badges) userData.badges = existingProfile.badges;

    if (userDocRef) {
      try {
        await store.fs.setDoc(userDocRef, userData, { merge: true });
      } catch (err) {
        console.warn('Firestore profile sync failed (continuing sign-in):', err);
      }
    }

    // Also persist developer profile under settings/developer_profile for cross-device persistence
    if (isDeveloper && store) {
      try {
        await store.fs.setDoc(store.fs.doc(store.db, 'settings', 'developer_profile'), {
          displayName: effectiveDisplayName,
          photoURL: effectivePhoto,
          photoUrl: effectivePhoto,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}
    }

    return {
      ...fbUser,
      // Firebase User methods live on its prototype, so object spread drops them.
      // Keep the method bound to the real User instance for AuthContext callers.
      getIdToken: fbUser.getIdToken.bind(fbUser),
      displayName: effectiveDisplayName,
      photoURL: effectivePhoto,
      photoUrl: effectivePhoto,
      customProfile: userData
    };
  } catch (error) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      const domainError = new Error(`Google Sign-In is not enabled for ${host}. Add this hostname in Firebase Authentication > Settings > Authorized domains.`);
      domainError.code = 'auth/unauthorized-domain';
      throw domainError;
    }
    if (error?.code === 'auth/popup-blocked') {
      const popupError = new Error('The Google sign-in popup was blocked. Allow pop-ups for this site and try again.');
      popupError.code = error.code;
      throw popupError;
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function syncProfileToFirestore(userId, profile) {
  if (!userId || !profile) return;
  const path = `users/${userId}`;
  try {
    const { fs, db } = await loadFirestore();
    const userDocRef = fs.doc(db, 'users', userId);
    const photo = profile.photoUrl || profile.photoURL || '';
    const payload = {
      id: userId,
      email: auth.currentUser?.email || profile.email || '',
      displayName: profile.displayName || '',
      photoURL: photo,
      photoUrl: photo,
      username: profile.username || '',
      bio: profile.bio || '',
      avatarColor: profile.avatarColor || '',
      updatedAt: new Date().toISOString()
    };
    if (profile.role) payload.role = profile.role;
    if (profile.badges) payload.badges = profile.badges;

    await fs.setDoc(userDocRef, payload, { merge: true });

    // If this is the developer account, mirror to global settings/developer_profile
    if (profile.role === 'developer' || auth.currentUser?.email?.toLowerCase() === 'mz0970mmz@gmail.com') {
      try {
        await fs.setDoc(fs.doc(db, 'settings', 'developer_profile'), {
          displayName: profile.displayName || '',
          photoURL: photo,
          photoUrl: photo,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchProfileFromFirestore(userId) {
  if (!userId) return null;
  try {
    const { fs, db } = await loadFirestore();
    const snap = await fs.getDoc(fs.doc(db, 'users', userId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('Failed to fetch profile from Firestore:', err);
    return null;
  }
}

export async function fetchDeveloperProfileFromFirestore() {
  try {
    const { fs, db } = await loadFirestore();
    const snap = await fs.getDoc(fs.doc(db, 'settings', 'developer_profile'));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/**
 * Real-time listener for user profile updates from Firestore across all devices.
 */
export function onProfileSnapshot(userId, callback) {
  if (!userId) return () => {};
  return deferredSnapshot(
    (fs, db) => fs.doc(db, 'users', userId),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    },
    'Real-time profile listener note'
  );
}

/**
 * Real-time listener for developer profile updates from Firestore across all devices.
 */
export function onDeveloperProfileSnapshot(callback) {
  return deferredSnapshot(
    (fs, db) => fs.doc(db, 'settings', 'developer_profile'),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    },
    'Real-time dev profile listener note'
  );
}

export async function syncFavoriteToFirestore(userId, fav) {
  if (!userId || !fav || !fav.slug) return;
  const path = `users/${userId}/favorites/${fav.slug}`;
  try {
    const { fs, db } = await loadFirestore();
    await fs.setDoc(fs.doc(db, 'users', userId, 'favorites', fav.slug), {
      slug: fav.slug,
      userId,
      titleEn: fav.title_en || fav.titleEn || '',
      titleAr: fav.title_ar || fav.titleAr || '',
      poster: fav.poster || '',
      banner: fav.banner || '',
      episodes: Number(fav.episodes || 0),
      createdAt: fav.created_at || new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function removeFavoriteFromFirestore(userId, slug) {
  if (!userId || !slug) return;
  const path = `users/${userId}/favorites/${slug}`;
  try {
    const { fs, db } = await loadFirestore();
    await fs.deleteDoc(fs.doc(db, 'users', userId, 'favorites', slug));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncProgressToFirestore(userId, progress) {
  if (!userId || !progress || !progress.slug) return;
  const docId = `${progress.slug}_${progress.episode || 1}`;
  const path = `users/${userId}/progress/${docId}`;
  try {
    const { fs, db } = await loadFirestore();
    await fs.setDoc(fs.doc(db, 'users', userId, 'progress', docId), {
      slug: progress.slug,
      userId,
      episode: Number(progress.episode || 1),
      position: Number(progress.position || 0),
      duration: Number(progress.duration || 0),
      completed: Boolean(progress.completed),
      titleEn: progress.title_en || progress.titleEn || '',
      titleAr: progress.title_ar || progress.titleAr || '',
      poster: progress.poster || '',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Real-time listener for community posts in Firestore
 */
export function onCommunitySnapshot(callback) {
  return deferredSnapshot(
    (fs, db) => fs.collection(db, 'community_posts'),
    (snap) => {
      const posts = [];
      snap.forEach((docSnap) => {
        posts.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(posts);
    },
    'Real-time community snapshot note'
  );
}

export async function syncCommunityPostToFirestore(post) {
  if (!post) return;
  try {
    const docId = String(post.id || `post_${Date.now()}`);
    const { fs, db } = await loadFirestore();
    await fs.setDoc(fs.doc(db, 'community_posts', docId), {
      ...post,
      id: docId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore community post sync note:', err.message);
  }
}
