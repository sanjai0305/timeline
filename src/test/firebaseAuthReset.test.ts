import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  confirmPasswordReset: vi.fn(),
  fetchSignInMethodsForEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  ...mocks,
}));

vi.mock('../services/firebase', () => ({
  auth: { currentUser: null, app: { name: 'test-app' } },
  googleProvider: {},
  firestore: {},
}));

import {
  sendFirebasePasswordReset,
  verifyFirebaseResetCode,
  confirmFirebasePasswordReset,
} from '../services/auth';

describe('Firebase Native Password Reset Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendFirebasePasswordReset', () => {
    it('successfully calls sendPasswordResetEmail directly through Firebase SDK', async () => {
      mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
      mocks.fetchSignInMethodsForEmail.mockResolvedValue(['password']);

      const result = await sendFirebasePasswordReset('user@example.com');

      expect(mocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'user@example.com',
        expect.objectContaining({
          url: expect.any(String),
          handleCodeInApp: false,
        })
      );
      expect(result.isGoogleOnly).toBe(false);
    });

    it('protects against email enumeration when Firebase returns auth/user-not-found', async () => {
      mocks.sendPasswordResetEmail.mockRejectedValue({
        code: 'auth/user-not-found',
        message: 'User not found',
      });
      mocks.fetchSignInMethodsForEmail.mockResolvedValue([]);

      const result = await sendFirebasePasswordReset('nonexistent@example.com');
      // Must not throw, returns success response so attacker cannot probe valid emails
      expect(result.isGoogleOnly).toBe(false);
    });

    it('detects Google-only accounts and warns user without sending password reset', async () => {
      mocks.fetchSignInMethodsForEmail.mockResolvedValue(['google.com']);

      const result = await sendFirebasePasswordReset('googleuser@gmail.com');

      expect(result.isGoogleOnly).toBe(true);
      expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('throws friendly message on auth/invalid-email', async () => {
      mocks.fetchSignInMethodsForEmail.mockResolvedValue([]);
      mocks.sendPasswordResetEmail.mockRejectedValue({
        code: 'auth/invalid-email',
      });

      await expect(sendFirebasePasswordReset('not-an-email')).rejects.toThrow(
        'Please enter a valid email address.'
      );
    });

    it('throws friendly message on auth/too-many-requests', async () => {
      mocks.fetchSignInMethodsForEmail.mockResolvedValue([]);
      mocks.sendPasswordResetEmail.mockRejectedValue({
        code: 'auth/too-many-requests',
      });

      await expect(sendFirebasePasswordReset('user@example.com')).rejects.toThrow(
        'Too many attempts. Please wait a few minutes before trying again.'
      );
    });
  });

  describe('verifyFirebaseResetCode', () => {
    it('verifies valid oobCode and returns account email', async () => {
      mocks.verifyPasswordResetCode.mockResolvedValue('verified@example.com');

      const email = await verifyFirebaseResetCode('valid-oob-code-12345');
      expect(email).toBe('verified@example.com');
    });

    it('rejects empty or whitespace oobCode', async () => {
      await expect(verifyFirebaseResetCode('')).rejects.toThrow(
        'Invalid or missing password reset code.'
      );
      await expect(verifyFirebaseResetCode('   ')).rejects.toThrow(
        'Invalid or missing password reset code.'
      );
    });

    it('throws friendly message when reset link has expired', async () => {
      mocks.verifyPasswordResetCode.mockRejectedValue({
        code: 'auth/expired-action-code',
      });

      await expect(verifyFirebaseResetCode('expired-code')).rejects.toThrow(
        'This password reset link has expired. Please request a new one.'
      );
    });

    it('throws friendly message when reset link has already been used or is invalid', async () => {
      mocks.verifyPasswordResetCode.mockRejectedValue({
        code: 'auth/invalid-action-code',
      });

      await expect(verifyFirebaseResetCode('used-code')).rejects.toThrow(
        'This password reset link is invalid or has already been used.'
      );
    });
  });

  describe('confirmFirebasePasswordReset', () => {
    it('enforces minimum 8 characters password length', async () => {
      await expect(confirmFirebasePasswordReset('valid-code', 'short')).rejects.toThrow(
        'Password must be at least 8 characters long.'
      );
      expect(mocks.confirmPasswordReset).not.toHaveBeenCalled();
    });

    it('calls Firebase confirmPasswordReset with valid code and new password', async () => {
      mocks.confirmPasswordReset.mockResolvedValue(undefined);

      await confirmFirebasePasswordReset('valid-code-999', 'SecureNewPassword123!');
      expect(mocks.confirmPasswordReset).toHaveBeenCalledWith(
        expect.anything(),
        'valid-code-999',
        'SecureNewPassword123!'
      );
    });

    it('handles auth/weak-password error', async () => {
      mocks.confirmPasswordReset.mockRejectedValue({
        code: 'auth/weak-password',
      });

      await expect(
        confirmFirebasePasswordReset('valid-code-999', 'weakpass1')
      ).rejects.toThrow('Password is too weak');
    });
  });
});
