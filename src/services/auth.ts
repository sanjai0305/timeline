import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  fetchSignInMethodsForEmail,
  ActionCodeSettings,
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

export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
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

/**
 * Send password reset email directly through Firebase Authentication built-in service.
 * Respects user enumeration protection and checks for Google-only sign-in accounts.
 */
export async function sendFirebasePasswordReset(email: string): Promise<{ isGoogleOnly?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check if user registered via Google-only
  try {
    const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
    if (methods.length > 0 && !methods.includes('password') && methods.includes('google.com')) {
      return { isGoogleOnly: true };
    }
  } catch (err) {
    console.debug('[Auth Service] fetchSignInMethods check skipped:', err);
  }

  // 2. Configure actionCodeSettings pointing to authorized domain
  let actionCodeSettings: ActionCodeSettings | undefined = undefined;
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    const isAuthorized =
      origin.includes('localhost') ||
      origin.includes('time-line-5bbcd.firebaseapp.com') ||
      origin.includes('time-line-5bbcd.web.app');

    actionCodeSettings = {
      url: isAuthorized ? origin : 'https://time-line-5bbcd.firebaseapp.com',
      handleCodeInApp: false,
    };
  }

  try {
    if (actionCodeSettings) {
      await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
    } else {
      await sendPasswordResetEmail(auth, cleanEmail);
    }
    return { isGoogleOnly: false };
  } catch (err: any) {
    // Security: Do not reveal whether an email account exists
    if (err.code === 'auth/user-not-found') {
      return { isGoogleOnly: false };
    }
    if (err.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    if (err.code === 'auth/too-many-requests') {
      throw new Error('Too many attempts. Please wait a few minutes before trying again.');
    }
    if (err.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw new Error(err.message || 'Failed to send password reset email. Please try again.');
  }
}

/**
 * Verify Firebase native password reset action code (oobCode).
 * Returns the email address associated with the reset code.
 */
export async function verifyFirebaseResetCode(oobCode: string): Promise<string> {
  if (!oobCode || !oobCode.trim()) {
    throw new Error('Invalid or missing password reset code.');
  }
  try {
    const email = await verifyPasswordResetCode(auth, oobCode.trim());
    return email;
  } catch (err: any) {
    if (err.code === 'auth/expired-action-code') {
      throw new Error('This password reset link has expired. Please request a new one.');
    }
    if (err.code === 'auth/invalid-action-code') {
      throw new Error('This password reset link is invalid or has already been used.');
    }
    if (err.code === 'auth/user-disabled') {
      throw new Error('This user account has been disabled.');
    }
    throw new Error(err.message || 'Invalid or expired password reset link.');
  }
}

/**
 * Confirm password reset by applying the new password via Firebase confirmPasswordReset().
 */
export async function confirmFirebasePasswordReset(oobCode: string, newPass: string): Promise<void> {
  if (!newPass || newPass.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }
  try {
    await confirmPasswordReset(auth, oobCode.trim(), newPass);
  } catch (err: any) {
    if (err.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please choose a stronger password (minimum 8 characters).');
    }
    if (err.code === 'auth/expired-action-code') {
      throw new Error('This reset link has expired. Please request a new one.');
    }
    if (err.code === 'auth/invalid-action-code') {
      throw new Error('This reset link is invalid or has already been used.');
    }
    throw new Error(err.message || 'Failed to update password. Please try again.');
  }
}


