import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Mail,
  Eye,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useRoutineStore } from '@/store/routineStore';
import { useAuthStore } from '@/store/authStore';
import { MemberRole } from '@/types/api';
import { backButtonService } from '@/services/backButtonService';

interface AddCollaboratorModalProps {
  isOpen: boolean;
  timelineId: string;
  timelineName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddCollaboratorModal: React.FC<AddCollaboratorModalProps> = ({
  isOpen,
  timelineId,
  timelineName,
  onClose,
  onSuccess,
}) => {
  const { selectedMembers, inviteMember } = useRoutineStore();
  const { user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Android hardware back button & swipe back integration
  useEffect(() => {
    if (!isOpen) return;
    const unregister = backButtonService.registerModal(() => {
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, onClose]);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('editor');
      setError(null);
      setSuccessMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Email Format Validation
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    // 2. Prevent Inviting Oneself
    if (user?.email && user.email.toLowerCase() === cleanEmail) {
      setError('You are already the owner of this timeline.');
      return;
    }

    // 3. Duplicate Collaborator Check
    const alreadyMember = selectedMembers.some(
      (m) => m.email && m.email.toLowerCase() === cleanEmail
    );
    if (alreadyMember) {
      setError(`User ${cleanEmail} is already a collaborator on this timeline.`);
      return;
    }

    setIsLoading(true);
    try {
      await inviteMember(timelineId, cleanEmail, role);
      setSuccessMessage(`Invitation successfully sent to ${cleanEmail} as ${role}!`);
      setIsLoading(false);
      onSuccess?.();

      // Automatically close modal after brief confirmation display
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to send invitation. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Background Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-sm bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent flex-shrink-0">
              <UserPlus size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base truncate">Add Collaborator</h3>
              <p className="text-[11px] text-text-muted truncate">
                Target:{' '}
                <span className="text-brand-accent font-semibold">
                  {timelineName || 'Current Routine'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-white transition-colors"
            aria-label="Close Add Collaborator modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Auth Check Warning if not signed in */}
        {!user && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-2.5 text-amber-300 text-xs leading-relaxed">
            <Lock size={16} className="flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold text-white">Sign-in Required</p>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                Please sign in with your Cloud account to invite collaborators to this timeline.
              </p>
            </div>
          </div>
        )}

        {/* Error Feedback Alert */}
        {error && (
          <div className="mb-3.5 p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2 text-status-danger text-xs leading-relaxed">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Feedback Alert */}
        {successMessage && (
          <div className="mb-3.5 p-3 rounded-xl bg-status-success/10 border border-status-success/30 flex items-start space-x-2 text-status-success text-xs leading-relaxed">
            <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address Input */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Email Address *
            </label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3 text-text-muted pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="Enter collaborator email"
                required
                className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-text-muted/60 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Role &amp; Permissions *
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Editor Role */}
              <button
                type="button"
                onClick={() => setRole('editor')}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  role === 'editor'
                    ? 'bg-brand-purple/15 border-brand-purple text-white shadow-glow-purple-sm'
                    : 'bg-[#131326] border-white/5 text-text-secondary hover:border-white/10'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Edit3
                    size={14}
                    className={role === 'editor' ? 'text-brand-accent' : 'text-text-muted'}
                  />
                  <span className="text-xs font-bold text-white">Editor</span>
                </div>
                <p className="text-[10px] text-text-muted leading-tight">
                  Can edit activities, time slots, and schedule.
                </p>
              </button>

              {/* Viewer Role */}
              <button
                type="button"
                onClick={() => setRole('viewer')}
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  role === 'viewer'
                    ? 'bg-brand-purple/15 border-brand-purple text-white shadow-glow-purple-sm'
                    : 'bg-[#131326] border-white/5 text-text-secondary hover:border-white/10'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Eye
                    size={14}
                    className={role === 'viewer' ? 'text-brand-accent' : 'text-text-muted'}
                  />
                  <span className="text-xs font-bold text-white">Viewer</span>
                </div>
                <p className="text-[10px] text-text-muted leading-tight">
                  Read-only access to view routine timetable.
                </p>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-surface-secondary text-xs font-medium text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !user}
              className="flex-1 py-2.5 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
