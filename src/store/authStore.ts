import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
  syncUserProfile,
  UserProfile,
} from '@/services/auth';

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initAuth: () => () => void;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  initAuth: () => {
    set({ isLoading: true });
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser, isAuthenticated: true, isLoading: false, error: null });
        try {
          const profile = await syncUserProfile();
          if (profile) set({ profile });
        } catch (err) {
          console.warn('[Auth Store] Profile sync error:', err);
        }
      } else {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
      }
    });

    return unsubscribe;
  },

  signIn: async (email, pass) => {
    set({ isLoading: true, error: null });
    try {
      const user = await signInWithEmail(email, pass);
      const profile = await syncUserProfile();
      set({ user, profile, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to sign in', isLoading: false });
      throw err;
    }
  },

  signUp: async (email, pass, name) => {
    set({ isLoading: true, error: null });
    try {
      const user = await signUpWithEmail(email, pass, name);
      const profile = await syncUserProfile();
      set({ user, profile, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to sign up', isLoading: false });
      throw err;
    }
  },

  signInGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await signInWithGoogle();
      const profile = await syncUserProfile();
      set({ user, profile, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to sign in with Google', isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await signOutUser();
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to sign out', isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));

