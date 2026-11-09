import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mail, Lock, User, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { backButtonService } from '@/services/backButtonService';
import { ForgotPasswordView } from './ForgotPasswordView';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const { signIn, signUp, signInGoogle, isLoading, error, clearError } = useAuthStore();

  React.useEffect(() => {
    if (!isOpen) return;
    const unregister = backButtonService.registerModal(() => {
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, displayName.trim());
      } else {
        await signIn(email.trim(), password);
      }
      onClose();
    } catch {
      // Error handled in store
    }
  };

  const handleGoogle = async () => {
    clearError();
    try {
      await signInGoogle();
      onClose();
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        {isForgotPassword ? (
          <>
            <div className="flex justify-end pb-1">
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-text-muted hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <ForgotPasswordView
              initialEmail={email}
              onBackToSignIn={(prefilledEmail) => {
                if (prefilledEmail) setEmail(prefilledEmail);
                setPassword('');
                setIsForgotPassword(false);
              }}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent">
                  {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {isSignUp ? 'Create Cloud Account' : 'Welcome Back'}
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    {isSignUp ? 'Sync and collaborate in real time' : 'Sign in to access your timelines'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2 text-status-danger text-xs leading-relaxed">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Tab switch */}
            <div className="flex bg-[#121224] p-1 rounded-2xl mb-4 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  clearError();
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  !isSignUp ? 'bg-brand-purple text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  clearError();
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSignUp ? 'bg-brand-purple text-white shadow-sm' : 'text-text-muted hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Display Name
                  </label>
                  <div className="relative flex items-center">
                    <User size={16} className="absolute left-3 text-text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Smith"
                      className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-text-muted/60 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Email Address *
                </label>
                <div className="relative flex items-center">
                  <Mail size={16} className="absolute left-3 text-text-muted pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-text-muted/60 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Password *
                </label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-3 text-text-muted pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-text-muted/60 focus:outline-none"
                  />
                </div>
                {!isSignUp && (
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setIsForgotPassword(true);
                      }}
                      className="text-[11px] text-brand-accent hover:underline font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 mt-2 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#181830] px-2 text-[10px] text-text-muted uppercase tracking-wider absolute">
                or
              </span>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-medium flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.685-5.17 3.685-9.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.98-3.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.98 3.1c.95-2.85 3.6-4.96 6.73-4.96z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Legal Disclaimer */}
            <p className="text-[10px] text-text-muted text-center mt-3.5 leading-relaxed">
              By continuing, you agree to our{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/terms');
                }}
                className="text-brand-accent hover:underline font-semibold"
              >
                Terms &amp; Conditions
              </button>{' '}
              and acknowledge our{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/privacy');
                }}
                className="text-brand-accent hover:underline font-semibold"
              >
                Privacy Policy
              </button>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
};

