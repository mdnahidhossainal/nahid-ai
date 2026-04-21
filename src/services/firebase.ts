import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
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

const app = initializeApp(firebaseConfig);
// Using custom database ID from config as required by AI Studio setup
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
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
export const saveSessionToCloud = async (uid: string, session: any) => {
  const sessionsRef = collection(db, 'users', uid, 'sessions');
  await addDoc(sessionsRef, {
    userId: uid,
    ...session,
    createdAt: serverTimestamp()
  });
};

export const getSessionsFromCloud = async (uid: string) => {
  const sessionsRef = collection(db, 'users', uid, 'sessions');
  const q = query(sessionsRef, orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
