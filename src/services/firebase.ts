import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Capacitor } from '@capacitor/core';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const isNative = Capacitor.getPlatform() !== 'web';
    
    // For native platforms (Android/iOS), sometimes redirect works better if popup fails
    // However, popup is the default for web.
    // We'll try popup first as it's cleaner, but catch specifically for environment blocks.
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (popupError: any) {
      console.warn("Popup blocked or failed, trying redirect...", popupError);
      // If popup is blocked or requested action is invalid (often domain related in webview)
      if (isNative || popupError.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
        return null; // The page will redirect
      }
      throw popupError;
    }
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

// Check for redirect result on app load
export const checkAuthRedirect = async () => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error("Redirect auth error", error);
    return null;
  }
};

export const logout = () => auth.signOut();

/**
 * User Profile Services
 */
export const saveUserProfile = async (uid: string, profile: any) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, {
    uid,
    ...profile,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getUserProfile = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
};

/**
 * Memory Services
 */
export const addMemoryToCloud = async (uid: string, content: string) => {
  const memoriesRef = collection(db, 'users', uid, 'memories');
  await addDoc(memoriesRef, {
    userId: uid,
    content,
    timestamp: new Date().toISOString()
  });
};

export const getMemoriesFromCloud = async (uid: string) => {
  const memoriesRef = collection(db, 'users', uid, 'memories');
  const q = query(memoriesRef, orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const deleteMemoryFromCloud = async (uid: string, memoryId: string) => {
  const memoryRef = doc(db, 'users', uid, 'memories', memoryId);
  await deleteDoc(memoryRef);
};

/**
 * Chat History Services
 */
export const saveSessionToCloud = async (uid: string, session: any, sessionId?: string) => {
  const sessionsRef = collection(db, 'users', uid, 'sessions');
  if (sessionId) {
    const sessionDoc = doc(db, 'users', uid, 'sessions', sessionId);
    await setDoc(sessionDoc, {
      ...session,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return sessionId;
  } else {
    const docRef = await addDoc(sessionsRef, {
      userId: uid,
      ...session,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }
};

export const updateSessionTitle = async (uid: string, sessionId: string, title: string) => {
  const sessionDoc = doc(db, 'users', uid, 'sessions', sessionId);
  await setDoc(sessionDoc, {
    title,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

export const getSessionsFromCloud = async (uid: string) => {
  const sessionsRef = collection(db, 'users', uid, 'sessions');
  const q = query(sessionsRef, orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
