import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc,
  getDocs,
  getDocFromServer,
  collection,
  collectionGroup,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  writeBatch,
  Timestamp,
  enableMultiTabIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Enable persistence only in the browser
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Persistence failed: Browser not supported');
    }
  });
}

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

export { 
  onAuthStateChanged,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile, 
  updatePassword, 
  deleteUser, 
  reauthenticateWithCredential, 
  EmailAuthProvider, 
  sendPasswordResetEmail,
  doc,
  getDoc,
  getDocs,
  getDocFromServer,
  collection,
  collectionGroup,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  limit,
  writeBatch,
  Timestamp
};

export type { User };
