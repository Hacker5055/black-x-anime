import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setStoredToken, getStoredToken } from '../api.js';
import {
  auth,
  signInWithGoogle,
  syncProfileToFirestore,
  fetchProfileFromFirestore,
  fetchDeveloperProfileFromFirestore,
  onProfileSnapshot,
  onDeveloperProfileSnapshot
} from '../firebase.js';
import { signOut as fbSignOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fbUser, setFbUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data.user);
      setStats(data.stats);
      return data.user;
    } catch {
      setUser(null);
      setStats(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync Firebase Auth with app session on any device boot + real-time Firestore profile listener
  useEffect(() => {
    let unsubSnapshot = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (currentFbUser) => {
      setFbUser(currentFbUser);
      unsubSnapshot();

      if (currentFbUser) {
        try {
          // Check Firestore profile for this user
          const firestoreProfile = await fetchProfileFromFirestore(currentFbUser.uid);
          const devProfile = currentFbUser.email?.toLowerCase() === 'mz0970mmz@gmail.com'
            ? await fetchDeveloperProfileFromFirestore()
            : null;

          const effectiveName = firestoreProfile?.displayName || devProfile?.displayName || currentFbUser.displayName;
          const effectivePhoto = firestoreProfile?.photoUrl || firestoreProfile?.photoURL || devProfile?.photoUrl || currentFbUser.photoURL;

          const data = await api.post('/api/auth/google', {
            uid: currentFbUser.uid,
            email: currentFbUser.email,
            displayName: effectiveName,
            photoURL: effectivePhoto,
            username: firestoreProfile?.username,
            bio: firestoreProfile?.bio,
            avatarColor: firestoreProfile?.avatarColor
          });

          if (data.token) setStoredToken(data.token);
          setUser({
            ...data.user,
            photoURL: effectivePhoto || data.user.photoUrl,
            photoUrl: effectivePhoto || data.user.photoUrl,
            displayName: effectiveName || data.user.displayName,
            firebaseUid: currentFbUser.uid
          });

          // Real-time listener: whenever username or profile photo is updated on ANY device, instantly update state everywhere
          unsubSnapshot = onProfileSnapshot(currentFbUser.uid, (data) => {
            if (!data) return;
            setUser((prev) => {
              if (!prev) return prev;
              const newPhoto = data.photoUrl || data.photoURL || prev.photoUrl;
              return {
                ...prev,
                displayName: data.displayName || prev.displayName,
                username: data.username || prev.username,
                photoUrl: newPhoto,
                photoURL: newPhoto,
                avatarColor: data.avatarColor || prev.avatarColor,
                bio: data.bio !== undefined ? data.bio : prev.bio,
                badges: data.badges || prev.badges
              };
            });
          });
        } catch (err) {
          console.warn('Auth state cross-device sync note:', err.message);
        }
      }
    });

    return () => {
      unsubAuth();
      unsubSnapshot();
    };
  }, []);

  const applyRealtimeProfileUpdate = useCallback((data) => {
    if (!data) return;
    setUser((prev) => {
      if (!prev) return prev;
      const newPhoto = data.photoUrl || data.photoURL || prev.photoUrl;
      return {
        ...prev,
        displayName: data.displayName || prev.displayName,
        username: data.username || prev.username,
        photoUrl: newPhoto,
        photoURL: newPhoto,
        avatarColor: data.avatarColor || prev.avatarColor,
        bio: data.bio !== undefined ? data.bio : prev.bio,
        badges: data.badges || prev.badges
      };
    });
  }, []);

  // Additional listener for developer profile when not using Google Auth UID
  useEffect(() => {
    if (!user) return;
    const isDev = user.role === 'developer' || user.email?.toLowerCase() === 'mz0970mmz@gmail.com' || user.isDeveloper;
    if (!isDev) return;

    const unsub = onDeveloperProfileSnapshot((data) => {
      if (!data) return;
      applyRealtimeProfileUpdate(data);
    });
    return () => unsub();
  }, [user?.role, user?.email, applyRealtimeProfileUpdate]);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (username, password) => {
    const data = await api.post('/api/auth/login', { username, password });
    if (data.token) setStoredToken(data.token);
    setUser(data.user);
    await refresh();
    return data.user;
  }, [refresh]);

  const loginWithGoogle = useCallback(async () => {
    const firebaseUser = await signInWithGoogle();
    const data = await api.post('/api/auth/google', {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL || firebaseUser.photoUrl
    });
    if (data.token) setStoredToken(data.token);
    const enrichedUser = {
      ...data.user,
      photoURL: data.user.photoUrl || firebaseUser.photoURL || firebaseUser.photoUrl,
      photoUrl: data.user.photoUrl || firebaseUser.photoURL || firebaseUser.photoUrl,
      displayName: data.user.displayName || firebaseUser.displayName,
      firebaseUid: firebaseUser.uid
    };
    setUser(enrichedUser);
    await refresh();
    return enrichedUser;
  }, [refresh]);

  const loginAsDeveloper = useCallback(async () => {
    // Read persistent developer profile from Firestore if exists
    let devProfile = null;
    try {
      devProfile = await fetchDeveloperProfileFromFirestore();
    } catch {}

    const data = await api.post('/api/auth/dev-login', {
      displayName: devProfile?.displayName,
      photoURL: devProfile?.photoUrl || devProfile?.photoURL
    });

    if (data.token) setStoredToken(data.token);
    const finalUser = {
      ...data.user,
      displayName: devProfile?.displayName || data.user.displayName,
      photoUrl: devProfile?.photoUrl || devProfile?.photoURL || data.user.photoUrl,
      photoURL: devProfile?.photoUrl || devProfile?.photoURL || data.user.photoUrl
    };
    setUser(finalUser);
    await refresh();
    return finalUser;
  }, [refresh]);

  const register = useCallback(async (payload) => {
    const data = await api.post('/api/auth/register', payload);
    if (data.token) setStoredToken(data.token);
    setUser(data.user);
    await refresh();
    return data.user;
  }, [refresh]);

  const updateProfile = useCallback(async (payload) => {
    // 1. Update server session
    const data = await api.put('/api/auth/profile', payload);
    if (data.token) setStoredToken(data.token);

    // 2. Persist to Firestore across all devices
    const uid = auth.currentUser?.uid || (data.user.role === 'developer' ? 'developer' : null);
    if (uid) {
      await syncProfileToFirestore(uid, {
        ...payload,
        email: auth.currentUser?.email || data.user.email,
        role: data.user.role,
        badges: data.user.badges
      }).catch((e) => console.warn('Firestore profile sync note:', e));
    }

    const updatedUser = {
      ...data.user,
      photoUrl: payload.photoUrl || data.user.photoUrl,
      photoURL: payload.photoUrl || data.user.photoUrl,
      displayName: payload.displayName || data.user.displayName
    };
    setUser(updatedUser);
    await refresh();
    return updatedUser;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fbSignOut(auth);
    } catch {
      /* ignore */
    }
    setStoredToken(null);
    await api.post('/api/auth/logout', {}).catch(() => {});
    setUser(null);
    setStats(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, fbUser, stats, loading, login, loginWithGoogle, loginAsDeveloper, register, updateProfile, applyRealtimeProfileUpdate, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
