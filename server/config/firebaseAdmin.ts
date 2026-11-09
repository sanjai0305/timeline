import adminModule from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Support both ESM default import and CJS exports
const admin: typeof adminModule = (adminModule as any).default || adminModule;

const projectId = process.env.FIREBASE_PROJECT_ID || 'time-line-5bbcd';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  // Replace escaped newlines with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');
}

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
      // Use application default credentials or project ID only (works on GCP / Vercel with ADC or emulators)
      admin.initializeApp({
        projectId,
      });
      console.log('[Firebase Admin] Initialized with Project ID:', projectId);
    }
  } catch (err) {
    console.error('[Firebase Admin] Initialization error:', err);
  }
}

export const firebaseAdmin = admin;
export const auth = admin.auth();
export const db = admin.firestore();
export default admin;
