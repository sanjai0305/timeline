import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Crown,
  Shield,
  Clock,
} from 'lucide-react';
import { useRoutineStore } from '@/store/routineStore';
import { MemberRole } from '../../../api/types/api';
import { backButtonService } from '@/services/backButtonService';
import { AddCollaboratorModal } from './AddCollaboratorModal';

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
  const { selectedMembers, updateMemberRole, removeMember } = useRoutineStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Register Android back button handler for ShareModal
  useEffect(() => {
    if (!isOpen || isAddModalOpen) return;
    const unregister = backButtonService.registerModal(() => {
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, isAddModalOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(timelineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (window.confirm(`Remove ${email} from this timeline?`)) {
      try {
        await removeMember(timelineId, userId);
      } catch (err: any) {
        setError(err.message || 'Failed to remove member');
      }
    }
  };

  const handleRoleChange = async (userId: string, newRole: MemberRole) => {
    try {
      await updateMemberRole(timelineId, userId, newRole);
    } catch (err: any) {
      setError(err.message || 'Failed to update member role');
    }
  };

  const isOwner = userRole === 'owner';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Dialog */}
        <div className="relative w-full max-w-sm bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent flex-shrink-0">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-base truncate">Collaborators</h3>
                <p className="text-[11px] text-text-muted truncate max-w-[200px]">
                  {timelineName || 'Routine'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {isOwner && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="p-1.5 rounded-lg bg-brand-purple/20 text-brand-accent hover:bg-brand-purple/30 transition-colors"
                  title="Add Collaborator"
                  aria-label="Add Collaborator"
                >
                  <UserPlus size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-text-muted hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-3.5 p-2.5 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2 text-status-danger text-xs leading-relaxed">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Prominent Add Collaborator Button for Timeline Owners */}
          {isOwner ? (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-2.5 mb-4 rounded-2xl bg-purple-gradient text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-glow-purple-sm active:scale-95 transition-all hover:opacity-95"
            >
              <UserPlus size={15} />
              <span>+ Add Collaborator</span>
            </button>
          ) : (
            <div className="mb-4 p-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center space-x-2 text-text-muted text-xs">
              <Shield size={14} className="text-brand-accent flex-shrink-0" />
              <span>
                You have <strong className="text-white capitalize">{userRole}</strong> access. Only owners can invite collaborators.
              </span>
            </div>
          )}

          {/* Members List Section */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Members ({selectedMembers.length || 1})
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-[11px] text-brand-accent hover:underline flex items-center space-x-1"
              >
                {copied ? <Check size={12} className="text-status-success" /> : <Copy size={12} />}
                <span>{copied ? 'Copied ID' : 'Copy ID'}</span>
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {selectedMembers.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface border border-white/5 text-center">
                  <p className="text-xs text-text-muted">No collaborators added yet.</p>
                  {isOwner && (
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-2 text-xs text-brand-accent font-semibold hover:underline"
                    >
                      Invite your first collaborator
                    </button>
                  )}
                </div>
              ) : (
                selectedMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-surface border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-brand-purple/20 text-brand-accent font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {member.displayName ? member.displayName[0].toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-semibold text-white truncate">
                            {member.displayName || member.email}
                          </span>
                          {member.role === 'owner' && (
                            <Crown size={12} className="text-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <p className="text-[10px] text-text-muted truncate">{member.email}</p>
                          {member.status === 'invited' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-medium flex items-center space-x-0.5 flex-shrink-0">
                              <Clock size={9} className="mr-0.5" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Role & Action Controls */}
                    <div className="flex items-center space-x-1.5 flex-shrink-0 pl-2">
                      {isOwner && member.role !== 'owner' ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(member.userId, e.target.value as MemberRole)
                            }
                            className="bg-[#131326] border border-white/10 text-[11px] text-text-secondary rounded-lg px-2 py-1 focus:outline-none [color-scheme:dark]"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.userId, member.email)}
                            className="p-1.5 text-status-danger/70 hover:text-status-danger hover:bg-status-danger/10 rounded-lg transition-colors"
                            title="Remove member"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            member.role === 'owner'
                              ? 'bg-amber-500/20 text-amber-400'
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
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-surface-secondary text-xs font-semibold text-text-secondary hover:text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Add Collaborator Modal */}
      <AddCollaboratorModal
        isOpen={isAddModalOpen}
        timelineId={timelineId}
        timelineName={timelineName}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
};
