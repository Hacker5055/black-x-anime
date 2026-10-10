import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

// Test connection on boot as mandated by the Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGoogle() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;

    // Check if a customized user profile document already exists in Firestore
    const userDocRef = doc(db, 'users', fbUser.uid);
    let existingProfile = null;
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        existingProfile = snap.data();
      }
    } catch (err) {
      console.warn('Could not read existing Firestore user doc:', err);
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

    try {
      await setDoc(userDocRef, userData, { merge: true });
    } catch (err) {
      console.warn('Firestore profile sync failed (continuing sign-in):', err);
    }

    // Also persist developer profile under settings/developer_profile for cross-device persistence
    if (isDeveloper) {
      try {
        await setDoc(doc(db, 'settings', 'developer_profile'), {
          displayName: effectiveDisplayName,
          photoURL: effectivePhoto,
          photoUrl: effectivePhoto,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}
    }

    return {
      ...fbUser,
      displayName: effectiveDisplayName,
      photoURL: effectivePhoto,
      photoUrl: effectivePhoto,
      customProfile: userData
    };
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function syncProfileToFirestore(userId, profile) {
  if (!userId || !profile) return;
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
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

    await setDoc(userDocRef, payload, { merge: true });

    // If this is the developer account, mirror to global settings/developer_profile
    if (profile.role === 'developer' || auth.currentUser?.email?.toLowerCase() === 'mz0970mmz@gmail.com') {
      try {
        await setDoc(doc(db, 'settings', 'developer_profile'), {
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
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('Failed to fetch profile from Firestore:', err);
    return null;
  }
}

export async function fetchDeveloperProfileFromFirestore() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'developer_profile'));
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
  try {
    return onSnapshot(
      doc(db, 'users', userId),
      (snap) => {
        if (snap.exists()) {
          callback(snap.data());
        }
      },
      (error) => {
        console.warn('Real-time profile listener note:', error.message);
      }
    );
  } catch (err) {
    console.warn('Failed to bind onProfileSnapshot:', err);
    return () => {};
  }
}

/**
 * Real-time listener for developer profile updates from Firestore across all devices.
 */
export function onDeveloperProfileSnapshot(callback) {
  try {
    return onSnapshot(
      doc(db, 'settings', 'developer_profile'),
      (snap) => {
        if (snap.exists()) {
          callback(snap.data());
        }
      },
      (error) => {
        console.warn('Real-time dev profile listener note:', error.message);
      }
    );
  } catch (err) {
    console.warn('Failed to bind onDeveloperProfileSnapshot:', err);
    return () => {};
  }
}

export async function syncFavoriteToFirestore(userId, fav) {
  if (!userId || !fav || !fav.slug) return;
  const path = `users/${userId}/favorites/${fav.slug}`;
  try {
    await setDoc(doc(db, 'users', userId, 'favorites', fav.slug), {
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
    await deleteDoc(doc(db, 'users', userId, 'favorites', slug));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function syncProgressToFirestore(userId, progress) {
  if (!userId || !progress || !progress.slug) return;
  const docId = `${progress.slug}_${progress.episode || 1}`;
  const path = `users/${userId}/progress/${docId}`;
  try {
    await setDoc(doc(db, 'users', userId, 'progress', docId), {
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
  try {
    return onSnapshot(
      collection(db, 'community_posts'),
      (snap) => {
        const posts = [];
        snap.forEach((docSnap) => {
          posts.push({ id: docSnap.id, ...docSnap.data() });
        });
        callback(posts);
      },
      (err) => {
        console.warn('Real-time community snapshot note:', err.message);
      }
    );
  } catch (err) {
    console.warn('Could not bind community listener:', err);
    return () => {};
  }
}

export async function syncCommunityPostToFirestore(post) {
  if (!post) return;
  try {
    const docId = String(post.id || `post_${Date.now()}`);
    await setDoc(doc(db, 'community_posts', docId), {
      ...post,
      id: docId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore community post sync note:', err.message);
  }
}
