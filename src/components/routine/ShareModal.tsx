import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import {
  X,
  ArrowLeft,
  Users,
  UserPlus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Crown,
  Shield,
  Clock,
  CheckCircle2,
  RefreshCw,
  Mail,
  Calendar as CalendarIcon,
  Info,
} from 'lucide-react';
import { useRoutineStore } from '@/store/routineStore';
import { useAuthStore } from '@/store/authStore';
import { MemberRole, TimelineMember } from '@/types/api';
import { backButtonService } from '@/services/backButtonService';
import { formatDateRange } from '@/utils/date';

interface ErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
  onRetry: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ShareModalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'An unexpected rendering error occurred' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ShareModal ErrorBoundary caught]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={this.props.onClose} />
          <div className="relative w-full max-w-sm bg-[#181830] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-status-danger/20 border border-status-danger/40 text-status-danger mx-auto flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Unable to load collaborators</h3>
              <p className="text-xs text-text-muted mt-1">
                An unexpected error occurred while rendering the collaboration interface.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, errorMessage: '' });
                  this.props.onRetry();
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm hover:opacity-95 transition-all"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={this.props.onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/15 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ShareModalProps {
  isOpen: boolean;
  timelineId: string;
  timelineName: string;
  startDate?: string;
  endDate?: string;
  userRole?: MemberRole;
  onClose: () => void;
}

export const ShareModalContent: React.FC<ShareModalProps> = ({
  isOpen,
  timelineId,
  timelineName,
  startDate,
  endDate,
  userRole = 'owner',
  onClose,
}) => {
  const {
    selectedMembers,
    fetchMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useRoutineStore();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Add collaborator form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Selected member details preview
  const [detailMember, setDetailMember] = useState<TimelineMember | null>(null);

  const [copied, setCopied] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Register Android back button
  useEffect(() => {
    if (!isOpen) return;
    const unregister = backButtonService.registerModal(() => {
      if (detailMember) {
        setDetailMember(null);
        return true;
      }
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, detailMember, onClose]);

  // Fetch members on modal open or timelineId change
  const loadMembers = React.useCallback(async () => {
    if (!timelineId) {
      setLoadError('Timeline ID is missing.');
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      await fetchMembers(timelineId);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      if (err?.status === 401 || err?.code === 'UNAUTHORIZED') {
        setLoadError('Please sign in to access and manage collaborators.');
      } else if (err?.status === 404 || err?.code === 'NOT_FOUND') {
        // Timeline not found in cloud yet (stored locally)
        setLoadError('This routine is stored locally on your device. Sync to Cloud to invite collaborators.');
      } else {
        setLoadError(err?.message || 'Unable to load collaborators. Please check your network connection.');
      }
    }
  }, [timelineId, fetchMembers]);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('editor');
      setInviteError(null);
      setInviteSuccess(null);
      setDetailMember(null);
      loadMembers();
    }
  }, [isOpen, loadMembers]);

  if (!isOpen) return null;

  const isOwner = userRole === 'owner';

  const handleCopyLink = () => {
    try {
      const shareUrl = `${window.location.origin}/routines/${timelineId}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: Copy ID
      try {
        navigator.clipboard.writeText(timelineId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard unavailable
      }
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Validation
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setInviteError('Please enter a valid email address.');
      return;
    }

    // 2. Prevent inviting oneself
    if (user?.email && user.email.toLowerCase() === cleanEmail) {
      setInviteError('You are already the owner of this timeline.');
      return;
    }

    // 3. Duplicate check
    const isAlreadyMember = (selectedMembers || []).some(
      (m) => m?.email && m.email.toLowerCase() === cleanEmail
    );
    if (isAlreadyMember) {
      setInviteError(`User ${cleanEmail} is already a collaborator.`);
      return;
    }

    setIsInviting(true);
    try {
      await inviteMember(timelineId, cleanEmail, role);
      setIsInviting(false);
      setInviteSuccess(`Invitation sent to ${cleanEmail} as ${role}!`);
      setEmail('');
      setTimeout(() => setInviteSuccess(null), 4000);
      // Reload members list to ensure sync
      loadMembers();
    } catch (err: any) {
      setIsInviting(false);
      setInviteError(err.message || 'Failed to send invitation. Please try again.');
    }
  };

  const handleRemove = async (targetUserId: string, targetEmail: string) => {
    if (!window.confirm(`Remove ${targetEmail} from this timeline?`)) return;

    try {
      await removeMember(timelineId, targetUserId);
      loadMembers();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to remove member.');
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: MemberRole) => {
    try {
      await updateMemberRole(timelineId, targetUserId, newRole);
      loadMembers();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to update member role.');
    }
  };

  const safeMembers: TimelineMember[] = Array.isArray(selectedMembers)
    ? selectedMembers.filter((m) => m && typeof m === 'object' && m.userId)
    : [];

  // Determine date range text
  const dateRangeText = startDate && endDate ? formatDateRange(startDate, endDate) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Background Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md max-h-[88vh] bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Screen Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -ml-1 rounded-xl text-text-muted hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base tracking-tight">Share &amp; Collaborate</h3>
              <p className="text-xs font-semibold text-brand-accent truncate mt-0.5">
                {timelineName || 'Current Routine'}
              </p>
              {dateRangeText && (
                <p className="text-[10px] text-text-muted flex items-center space-x-1 mt-0.5">
                  <CalendarIcon size={10} className="flex-shrink-0 text-text-muted/70" />
                  <span className="truncate">{dateRangeText}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-colors ml-2 flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto py-3.5 space-y-4 pr-0.5 [scrollbar-width:thin]">
          {/* Section 1: Add Collaborator (Visible to Owner) */}
          {isOwner ? (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <UserPlus size={14} className="text-brand-accent" />
                  <span>Add Collaborator</span>
                </span>
                <span className="text-[10px] text-text-muted">Invite team or family</span>
              </div>

              <form onSubmit={handleInvite} noValidate className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-text-secondary mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={15} className="absolute left-3 text-text-muted pointer-events-none" />
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      required
                      className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-text-muted/60 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-1/2">
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as MemberRole)}
                      className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none [color-scheme:dark]"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>

                  <div className="w-1/2 flex items-end">
                    <button
                      type="submit"
                      disabled={isInviting || !email.trim()}
                      className="w-full py-2 px-3 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
                    >
                      {isInviting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <UserPlus size={14} />
                          <span>Send Invitation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Inline Invite Error */}
                {inviteError && (
                  <div className="p-2.5 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2 text-status-danger text-xs leading-relaxed animate-in fade-in duration-150">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{inviteError}</span>
                  </div>
                )}

                {/* Inline Invite Success */}
                {inviteSuccess && (
                  <div className="p-2.5 rounded-xl bg-status-success/10 border border-status-success/30 flex items-start space-x-2 text-status-success text-xs leading-relaxed animate-in fade-in duration-150">
                    <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{inviteSuccess}</span>
                  </div>
                )}
              </form>
            </div>
          ) : (
            /* Non-owner permission message */
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center space-x-2.5 text-text-muted text-xs">
              <Shield size={16} className="text-brand-accent flex-shrink-0" />
              <span>
                You have <strong className="text-white capitalize">{userRole}</strong> access. Only timeline owners can invite or remove members.
              </span>
            </div>
          )}

          {/* Section 2: Current Members Header & Copy ID */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Users size={14} className="text-brand-accent" />
                <span>Current Members</span>
                <span className="text-text-muted text-[11px] font-normal">
                  ({safeMembers.length})
                </span>
              </span>

              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[11px] text-brand-accent hover:underline flex items-center space-x-1 font-medium transition-colors"
                title="Copy timeline share link"
              >
                {copied ? <Check size={13} className="text-status-success" /> : <Copy size={13} />}
                <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
              </button>
            </div>

            {/* State A: Loading Members */}
            {isLoading && (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <div className="w-7 h-7 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-text-muted">Loading collaborators...</p>
              </div>
            )}

            {/* State B: Load Error */}
            {!isLoading && loadError && (
              <div className="p-4 rounded-2xl bg-status-danger/10 border border-status-danger/30 text-center space-y-2.5">
                <AlertCircle size={24} className="text-status-danger mx-auto" />
                <p className="text-xs font-semibold text-status-danger">Unable to load collaborators</p>
                <p className="text-[11px] text-text-muted leading-relaxed">{loadError}</p>
                <button
                  type="button"
                  onClick={loadMembers}
                  className="px-4 py-1.5 rounded-xl bg-brand-purple/20 text-brand-accent hover:bg-brand-purple/30 text-xs font-semibold transition-colors inline-flex items-center space-x-1.5"
                >
                  <RefreshCw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* State C: Empty Members List */}
            {!isLoading && !loadError && safeMembers.length === 0 && (
              <div className="p-6 rounded-2xl bg-surface border border-white/5 text-center space-y-2">
                <Users size={28} className="text-text-muted/40 mx-auto" />
                <p className="text-xs font-semibold text-white">No collaborators yet.</p>
                <p className="text-[11px] text-text-muted">
                  Share this routine with colleagues or family to plan and collaborate together.
                </p>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => emailInputRef.current?.focus()}
                    className="mt-1 text-xs text-brand-accent font-semibold hover:underline inline-flex items-center space-x-1"
                  >
                    <UserPlus size={13} />
                    <span>Add Collaborator</span>
                  </button>
                )}
              </div>
            )}

            {/* State D: Render Members List */}
            {!isLoading && !loadError && safeMembers.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
                {safeMembers.map((member) => {
                  const isMemberOwner = member.role === 'owner';
                  const isSelf = user?.uid && member.userId === user.uid;

                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-surface border border-white/5 hover:border-white/10 transition-colors"
                    >
                      {/* Avatar & Info */}
                      <div
                        className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer"
                        onClick={() => setDetailMember(member)}
                      >
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.displayName || member.email}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-brand-purple/20 text-brand-accent font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {member.displayName ? member.displayName[0].toUpperCase() : member.email[0].toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-semibold text-white truncate">
                              {member.displayName || member.email.split('@')[0]}
                            </span>
                            {isSelf && (
                              <span className="text-[9px] px-1 rounded bg-white/10 text-text-muted">
                                You
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <p className="text-[10px] text-text-muted truncate">{member.email}</p>

                            {/* Status Badge: Owner | Active | Pending */}
                            {isMemberOwner ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold flex items-center space-x-0.5 flex-shrink-0">
                                <Crown size={9} className="mr-0.5" />
                                Owner
                              </span>
                            ) : member.status === 'invited' ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 font-medium flex items-center space-x-0.5 flex-shrink-0">
                                <Clock size={9} className="mr-0.5" />
                                Pending
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-medium flex items-center space-x-0.5 flex-shrink-0">
                                <CheckCircle2 size={9} className="mr-0.5" />
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Controls (Change role / Delete) */}
                      <div className="flex items-center space-x-1.5 flex-shrink-0 pl-2">
                        {isOwner && !isMemberOwner ? (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(member.userId, e.target.value as MemberRole)
                              }
                              className="bg-[#131326] border border-white/10 text-[11px] text-text-secondary rounded-lg px-2 py-1 focus:outline-none [color-scheme:dark]"
                              aria-label={`Change role for ${member.displayName || member.email}`}
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemove(member.userId, member.email)}
                              className="p-1.5 text-status-danger/70 hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors"
                              title={`Remove ${member.displayName || member.email}`}
                              aria-label={`Remove ${member.displayName || member.email}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                              isMemberOwner
                                ? 'bg-amber-500/20 text-amber-300'
                                : member.role === 'editor'
                                ? 'bg-brand-purple/20 text-brand-accent'
                                : 'bg-white/10 text-text-muted'
                            }`}
                          >
                            {member.role}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-surface-secondary text-xs font-semibold text-text-secondary hover:text-white transition-colors text-center"
          >
            Done
          </button>
        </div>

        {/* Member Details Popup Overlay */}
        {detailMember && (
          <div className="absolute inset-x-4 bottom-4 top-16 bg-[#121225] border border-white/15 rounded-2xl p-4 shadow-2xl z-20 flex flex-col justify-between animate-in fade-in duration-150">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Info size={14} className="text-brand-accent" />
                  <span>Member Details</span>
                </span>
                <button
                  type="button"
                  onClick={() => setDetailMember(null)}
                  className="p-1 rounded-lg text-text-muted hover:text-white"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex items-center space-x-3 pt-1">
                {detailMember.photoURL ? (
                  <img
                    src={detailMember.photoURL}
                    alt={detailMember.displayName}
                    className="w-10 h-10 rounded-full object-cover border border-white/15"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-purple/20 text-brand-accent font-bold text-sm flex items-center justify-center">
                    {detailMember.displayName ? detailMember.displayName[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {detailMember.displayName || 'Collaborator'}
                  </h4>
                  <p className="text-xs text-text-muted">{detailMember.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-text-muted block">Role</span>
                  <span className="text-xs font-semibold text-white capitalize">{detailMember.role}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-text-muted block">Status</span>
                  <span className="text-xs font-semibold text-brand-accent capitalize">
                    {detailMember.role === 'owner' ? 'Owner' : detailMember.status === 'invited' ? 'Pending' : 'Active'}
                  </span>
                </div>
                <div className="col-span-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-text-muted block">Joined At</span>
                  <span className="text-[11px] text-text-secondary">
                    {detailMember.joinedAt
                      ? new Date(detailMember.joinedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDetailMember(null)}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all mt-3"
            >
              Back to List
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const ShareModal: React.FC<ShareModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <ShareModalErrorBoundary onClose={props.onClose} onRetry={() => {}}>
      <ShareModalContent {...props} />
    </ShareModalErrorBoundary>
  );
};

export default ShareModal;
