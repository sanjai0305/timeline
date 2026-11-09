import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, PlusCircle, List, Settings, CheckCircle2 } from 'lucide-react';
import { backButtonService } from '@/services/backButtonService';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isOpen) return;
    const unregister = backButtonService.registerModal(() => {
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-72 max-w-[80%] bg-[#15152A] border-r border-white/10 h-full p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-gradient flex items-center justify-center shadow-glow-purple-sm">
                <Calendar size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">Routine Planner</h3>
                <p className="text-xs text-brand-accent">Android Edition</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <button
              onClick={() => {
                navigate('/');
                onClose();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <Calendar size={18} className="text-brand-purple" />
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                navigate('/create');
                onClose();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <PlusCircle size={18} className="text-brand-purple" />
              <span>Create Routine</span>
            </button>

            <button
              onClick={() => {
                navigate('/routines');
                onClose();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <List size={18} className="text-brand-purple" />
              <span>My Routines</span>
            </button>

            <button
              onClick={() => {
                navigate('/calendar');
                onClose();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <Calendar size={18} className="text-brand-purple" />
              <span>Calendar View</span>
            </button>

            <button
              onClick={() => {
                navigate('/profile');
                onClose();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <Settings size={18} className="text-brand-purple" />
              <span>Settings & Profile</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center">
          <div className="flex items-center justify-center space-x-1 text-xs text-text-muted">
            <CheckCircle2 size={12} className="text-status-success" />
            <span>SQLite Offline Ready</span>
          </div>
          <p className="text-[10px] text-text-muted/60 mt-1">Version 1.0.0 • Mobile First</p>
        </div>
      </div>
    </div>
  );
};

