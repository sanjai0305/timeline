import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const env = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) as Record<string, string | undefined>;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCoMHQ2J2mbEUAQT-pdMYgIbQkbTvr-MKFw',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'time-line-5bbcd.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'time-line-5bbcd',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'time-line-5bbcd.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '54297778155',
  appId: env.VITE_FIREBASE_APP_ID || '1:54297778155:web:991e48b0200ee2a53cebae',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-1548KQNZ0P',
};

// Initialize Firebase once
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

