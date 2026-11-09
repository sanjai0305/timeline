import React from 'react';
import { X, Bell, Calendar, Clock, CheckCircle } from 'lucide-react';
import { useRoutineStore } from '@/store/routineStore';
import { formatToYMD, formatDisplayDate } from '@/utils/date';
import { backButtonService } from '@/services/backButtonService';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { routines } = useRoutineStore();

  React.useEffect(() => {
    if (!isOpen) return;
    const unregister = backButtonService.registerModal(() => {
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const todayStr = formatToYMD(new Date());
  const activeToday = routines.filter(
    (r) => r.is_active === 1 && todayStr >= r.start_date && todayStr <= r.end_date
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Notifications</h3>
              <p className="text-xs text-text-muted">{formatDisplayDate(todayStr)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {activeToday.length > 0 ? (
            activeToday.map((routine) => (
              <div
                key={routine.id}
                className="p-3 rounded-2xl bg-surface-card border border-brand-purple/20 flex flex-col space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-white">{routine.name}</span>
                  <span className="text-[10px] bg-status-success/20 text-status-success px-2 py-0.5 rounded-full font-semibold">
                    Today Active
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-xs text-text-muted">
                  <span className="flex items-center space-x-1">
                    <Clock size={12} className="text-brand-purple" />
                    <span>{routine.slots.length} time slots scheduled</span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-text-muted">
              <CheckCircle size={32} className="mx-auto text-brand-purple/50 mb-2" />
              <p className="text-sm font-medium text-white">All caught up!</p>
              <p className="text-xs text-text-muted mt-1">No pending alerts or active routines for today.</p>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center space-x-3">
            <Calendar size={18} className="text-brand-accent flex-shrink-0" />
            <p className="text-xs text-text-secondary">
              Routines apply across all days in their date interval automatically.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-surface-secondary text-sm font-medium text-text-primary hover:bg-surface-secondary/80 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

