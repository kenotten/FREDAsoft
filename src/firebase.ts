import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// EXPLICIT DEFAULT INSTANCE BINDING
export const db = initializeFirestore(app, {
  databaseId: '(default)'
} as any);

export { app };

export const auth = getAuth(app);
export const storage = getStorage(app);
