import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { apiClient } from './api';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export async function signInWithEmail(email: string, password: string):Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  // Sync profile with backend
  await syncUserProfile();
  return credential.user;
}

export async function signUpWithEmail(email: string, password: string, displayName?: string): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && credential.user) {
    await updateProfile(credential.user, { displayName });
  }
  await syncUserProfile();
  return credential.user;
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const credential = await signInWithPopup(auth, googleProvider);
  await syncUserProfile();
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function syncUserProfile(): Promise<UserProfile | null> {
  if (!auth.currentUser) return null;
  try {
    const profile = await apiClient<UserProfile>('/api/auth/me', { method: 'GET' });
    return profile;
  } catch (err) {
    console.warn('[Auth Service] Failed to sync profile with backend:', err);
    return null;
  }
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

