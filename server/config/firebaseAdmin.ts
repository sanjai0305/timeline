import adminModule from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Support both ESM default import and CJS exports
const admin: typeof adminModule = (adminModule as any).default || adminModule;

const projectId = process.env.FIREBASE_PROJECT_ID || 'time-line-5bbcd';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  // Strip outer quotes if provided in env
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  // Replace escaped newlines with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
}

function ensureInitialized() {
  const apps = admin.apps || [];
  if (!apps.length) {
    try {
      if (clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log('[Firebase Admin] Initialized with Service Account');
      } else {
        // Fallback: Initialize with Project ID only
        admin.initializeApp({
          projectId,
        });
        console.log('[Firebase Admin] Initialized with Project ID:', projectId);
      }
    } catch (err) {
      console.error('[Firebase Admin] Initialization error:', err);
    }
  }
}

// Initialize on load
ensureInitialized();

export const firebaseAdmin = admin;

// Lazy proxy for auth to prevent top-level module crash if credentials are not ready
export const auth = new Proxy({} as adminModule.auth.Auth, {
  get(_target, prop) {
    ensureInitialized();
    const realAuth = admin.auth();
    const val = (realAuth as any)[prop];
    return typeof val === 'function' ? val.bind(realAuth) : val;
  },
});

// Lazy proxy for firestore to prevent top-level module crash
export const db = new Proxy({} as adminModule.firestore.Firestore, {
  get(_target, prop) {
    ensureInitialized();
    const realDb = admin.firestore();
    const val = (realDb as any)[prop];
    return typeof val === 'function' ? val.bind(realDb) : val;
  },
});

export default admin;
