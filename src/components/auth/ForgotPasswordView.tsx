import React, { useState, useEffect } from 'react';
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { sendFirebasePasswordReset } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { backButtonService } from '@/services/backButtonService';
import { ResetPasswordModal } from './ResetPasswordModal';

interface ForgotPasswordViewProps {
  initialEmail?: string;
  onBackToSignIn: (prefilledEmail?: string) => void;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  initialEmail = '',
  onBackToSignIn,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGoogleOnly, setIsGoogleOnly] = useState(false);

  // Manual code entry modal state (if user opens reset link or copies oobCode)
  const [manualCode, setManualCode] = useState('');
  const [showManualCodeInput, setShowManualCodeInput] = useState(false);
  const [activeOobCode, setActiveOobCode] = useState<string | null>(null);

  const { signInGoogle } = useAuthStore();

  // Register Android back button
  useEffect(() => {
    const unregister = backButtonService.registerModal(() => {
      if (showManualCodeInput) {
        setShowManualCodeInput(false);
        return true;
      }
      onBackToSignIn(email);
      return true;
    });
    return unregister;
  }, [showManualCodeInput, email, onBackToSignIn]);

  const validateEmail = (val: string): boolean => {
    const clean = val.trim();
    return clean.length >= 5 && clean.includes('@') && clean.includes('.');
  };

  const handleSendVerificationEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGoogleOnly(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendFirebasePasswordReset(cleanEmail);
      setIsLoading(false);

      if (result.isGoogleOnly) {
        setIsGoogleOnly(true);
        setError('This account uses Google Sign-In. Please continue with Google to access your account.');
        return;
      }

      setIsSuccess(true);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to send verification email. Please try again.');
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let code = manualCode.trim();
    if (!code) return;

    // If user pasted a full Firebase action URL, parse the oobCode
    try {
      if (code.includes('oobCode=')) {
        const url = new URL(code);
        const extracted = url.searchParams.get('oobCode');
        if (extracted) code = extracted;
      }
    } catch {
      // In case string isn't a full valid URL, check query regex
      const match = code.match(/oobCode=([^&]+)/);
      if (match && match[1]) {
        code = match[1];
      }
    }

    setActiveOobCode(code);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent">
            <KeyRound size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Forgot Password?</h3>
            <p className="text-[11px] text-text-muted">
              Firebase Email Verification
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onBackToSignIn(email)}
          className="p-1 rounded-lg text-text-muted hover:text-white transition-colors"
          title="Back to Sign In"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Google-only account advisory */}
      {isGoogleOnly ? (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-start space-x-2.5 text-amber-400 text-xs leading-relaxed">
            <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Google Account Detected</p>
              <p className="text-amber-300/90 text-[11px] leading-relaxed">
                This account was created using Google Sign-In. You do not have a separate password. Please continue with Google.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await signInGoogle();
                onBackToSignIn();
              } catch (err: any) {
                setError(err.message || 'Google sign-in failed');
              }
            }}
            className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center justify-center space-x-2 transition-all active:scale-95"
          >
            <span>Continue with Google</span>
          </button>
        </div>
      ) : null}

      {/* Error Banner */}
      {!isGoogleOnly && error && (
        <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2 text-status-danger text-xs leading-relaxed">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success State */}
      {isSuccess ? (
        <div className="space-y-4 py-1 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-status-success/10 border border-status-success/30 space-y-2.5">
            <div className="flex items-start space-x-2.5 text-status-success text-xs leading-relaxed">
              <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm mb-1">Check Your Email</p>
                <p className="text-text-secondary text-xs leading-relaxed">
                  Password reset instructions have been sent to your registered email address. Please check your inbox.
                </p>
              </div>
            </div>
            <p className="text-[11px] text-text-muted pl-7">
              Sent to: <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          <p className="text-[11px] text-text-muted text-center leading-relaxed">
            Click the secure link in the email to set your new password. The link will open directly in Routine Planner.
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onBackToSignIn(email)}
              className="w-full py-2.5 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm hover:opacity-95 active:scale-95 transition-all"
            >
              Return to Sign In
            </button>

            <button
              type="button"
              onClick={() => setShowManualCodeInput(!showManualCodeInput)}
              className="w-full py-2 text-[11px] text-brand-accent hover:underline text-center font-medium transition-colors"
            >
              {showManualCodeInput ? 'Hide Manual Code Entry' : 'Have a reset link or code? Enter it manually'}
            </button>
          </div>

          {showManualCodeInput && (
            <form onSubmit={handleManualCodeSubmit} className="pt-2 space-y-2.5 border-t border-white/10">
              <label className="block text-[11px] font-semibold text-text-secondary">
                Paste Reset Link or Action Code
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste reset URL or oobCode..."
                className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl px-3 py-2 text-xs text-white placeholder-text-muted/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all disabled:opacity-40"
              >
                Open Password Reset
              </button>
            </form>
          )}
        </div>
      ) : (
        /* Form State */
        <form onSubmit={handleSendVerificationEmail} className="space-y-3.5">
          <p className="text-xs text-text-secondary leading-relaxed">
            Enter your registered email address. We will send you a secure password reset verification email.
          </p>

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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 mt-2 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Sending Verification Email...' : 'Send Verification Email'}
          </button>

          <div className="pt-2 flex flex-col items-center space-y-2">
            <button
              type="button"
              onClick={() => onBackToSignIn(email)}
              className="text-xs text-text-muted hover:text-white transition-colors"
            >
              Remember your password? <span className="text-brand-accent font-semibold">Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => setShowManualCodeInput(!showManualCodeInput)}
              className="text-[11px] text-text-muted hover:text-white transition-colors"
            >
              {showManualCodeInput ? 'Hide' : 'Have a reset link or code?'}
            </button>
          </div>

          {showManualCodeInput && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste reset URL or oobCode..."
                className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl px-3 py-2 text-xs text-white placeholder-text-muted/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleManualCodeSubmit}
                disabled={!manualCode.trim()}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all disabled:opacity-40"
              >
                Proceed to Reset Password
              </button>
            </div>
          )}
        </form>
      )}

      {/* Manual Reset Modal if action code is triggered */}
      {activeOobCode && (
        <ResetPasswordModal
          isOpen={true}
          oobCode={activeOobCode}
          onClose={() => setActiveOobCode(null)}
          onSuccess={(updatedEmail) => {
            setActiveOobCode(null);
            onBackToSignIn(updatedEmail || email);
          }}
        />
      )}
    </div>
  );
};

export default ForgotPasswordView;
