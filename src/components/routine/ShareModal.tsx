import React, { useState } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { useRoutineStore } from '@/store/routineStore';
import { MemberRole } from '../../../api/types/api';
import { backButtonService } from '@/services/backButtonService';

interface ShareModalProps {
  isOpen: boolean;
  timelineId: string;
  timelineName: string;
  userRole: MemberRole;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  timelineId,
  timelineName,
  userRole,
  onClose,
}) => {
  const { selectedMembers, inviteMember, updateMemberRole, removeMember } = useRoutineStore();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const unregister = backButtonService.registerModal(() => {
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await inviteMember(timelineId, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send invite');
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(timelineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwner = userRole === 'owner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent">
              <Users size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Collaborate</h3>
              <p className="text-[11px] text-text-muted truncate max-w-[200px]">{timelineName}</p>
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
          <div className="mb-3 p-2.5 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2 text-status-danger text-xs leading-relaxed">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Invite Form (Owner Only) */}
        {isOwner && (
          <form onSubmit={handleInvite} className="mb-4 bg-surface p-3 rounded-2xl border border-white/5 space-y-2.5">
            <span className="block text-xs font-semibold text-white">Invite Collaborator</span>
            <div className="flex space-x-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl px-3 py-1.5 text-xs text-white placeholder-text-muted/60 focus:outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                className="bg-[#131326] border border-white/10 text-xs text-text-secondary rounded-xl px-2 py-1.5 focus:outline-none [color-scheme:dark]"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 rounded-xl bg-purple-gradient text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-glow-purple-sm active:scale-95 transition-all disabled:opacity-50"
            >
              <UserPlus size={14} />
              <span>{isLoading ? 'Sending...' : 'Invite to Timeline'}</span>
            </button>
          </form>
        )}

        {/* Members List */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Members ({selectedMembers.length || 1})
            </span>
            <button
              onClick={handleCopyId}
              className="text-[11px] text-brand-accent hover:underline flex items-center space-x-1"
            >
              {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
              <span>{copied ? 'Copied ID' : 'Copy ID'}</span>
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {selectedMembers.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-white/5"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-brand-purple/20 text-brand-accent font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {member.displayName ? member.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-semibold text-white truncate">
                        {member.displayName}
                      </span>
                      {member.role === 'owner' && (
                        <Crown size={12} className="text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted truncate">{member.email}</p>
                  </div>
                </div>

                {/* Role and Actions */}
                <div className="flex items-center space-x-1.5 flex-shrink-0 pl-2">
                  {isOwner && member.role !== 'owner' ? (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(timelineId, member.userId, e.target.value as MemberRole)}
                        className="bg-[#131326] border border-white/10 text-[10px] text-text-secondary rounded-lg px-2 py-1 focus:outline-none [color-scheme:dark]"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => removeMember(timelineId, member.userId)}
                        className="p-1 text-status-danger/70 hover:text-status-danger rounded"
                        title="Remove member"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      member.role === 'owner'
                        ? 'bg-amber-500/20 text-amber-400'
                        : member.role === 'editor'
                        ? 'bg-brand-purple/20 text-brand-accent'
                        : 'bg-white/10 text-text-muted'
                    }`}>
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-surface-secondary text-xs font-medium text-text-secondary hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
