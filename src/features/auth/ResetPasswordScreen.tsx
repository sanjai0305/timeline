import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, ArrowLeft } from 'lucide-react';
import { verifyFirebaseResetCode, confirmFirebasePasswordReset } from '@/services/auth';

export const ResetPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract oobCode from searchParams (?oobCode=XYZ or ?code=XYZ)
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';

  const [targetEmail, setTargetEmail] = useState<string>('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(true);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setCodeError('No password reset verification code was found in this link. Please request a new link.');
      setIsVerifyingCode(false);
      return;
    }

    let isMounted = true;
    setIsVerifyingCode(true);
    setCodeError(null);

    verifyFirebaseResetCode(oobCode)
      .then((email) => {
        if (!isMounted) return;
        setTargetEmail(email);
        setIsVerifyingCode(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setCodeError(err.message || 'Invalid or expired password reset link. Please request a new one.');
        setIsVerifyingCode(false);
      });

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (newPassword.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmFirebasePasswordReset(oobCode, newPassword);
      setIsSuccess(true);
      setIsSubmitting(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Failed to update password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#181830] border border-white/10 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center space-x-3 pb-4 border-b border-white/10 mb-4">
          <div className="p-2.5 rounded-2xl bg-brand-purple/20 text-brand-accent">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">Create New Password</h2>
            <p className="text-xs text-text-muted">
              {targetEmail ? `Account: ${targetEmail}` : 'Secure Password Reset'}
            </p>
          </div>
        </div>

        {/* State 1: Verifying action code */}
        {isVerifyingCode && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-secondary">Verifying secure password reset link...</p>
          </div>
        )}

        {/* State 2: Error verifying code */}
        {!isVerifyingCode && codeError && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2.5 text-status-danger text-xs leading-relaxed">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Reset Link Expired or Invalid</p>
                <p className="text-status-danger/90">{codeError}</p>
              </div>
            </div>

            <p className="text-[11px] text-text-muted text-center leading-relaxed">
              Password reset links are single-use and expire for security. Please request a new verification email.
            </p>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <ArrowLeft size={16} />
              <span>Return to Routine Planner</span>
            </button>
          </div>
        )}

        {/* State 3: Success Confirmation */}
        {!isVerifyingCode && isSuccess && (
          <div className="space-y-4 text-center py-4 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-status-success/20 border border-status-success/40 text-status-success mx-auto flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">Password Updated</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Your password has been successfully updated.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 mt-2 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm hover:opacity-95 active:scale-95 transition-all"
            >
              Return to Sign In
            </button>
          </div>
        )}

        {/* State 4: Password Form */}
        {!isVerifyingCode && !codeError && !isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2 text-status-danger text-xs leading-relaxed">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                New Password *
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3 text-text-muted pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-text-muted/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-text-muted hover:text-white p-0.5 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-text-muted mt-1">Must be at least 8 characters.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Confirm New Password *
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3 text-text-muted pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  minLength={8}
                  className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-text-muted/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 text-text-muted hover:text-white p-0.5 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 mt-2 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              disabled={isSubmitting}
              className="w-full py-2 text-xs text-text-muted hover:text-white transition-colors text-center"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordScreen;

