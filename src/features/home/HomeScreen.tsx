import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Plus, List, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarIllustration } from '@/components/home/CalendarIllustration';
import { QuickStats } from '@/components/home/QuickStats';
import { DrawerMenu } from '@/components/navigation/DrawerMenu';
import { NotificationModal } from '@/components/navigation/NotificationModal';
import { useRoutineStore } from '@/store/routineStore';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const { stats, routines, fetchRoutines } = useRoutineStore();

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  return (
    <div className="min-h-screen bg-background text-text-primary px-5 pt-3 pb-24 flex flex-col justify-between max-w-md mx-auto relative overflow-hidden">
      {/* Top Header */}
      <div>
        <header className="flex items-center justify-between py-2 mb-2">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 rounded-xl text-white hover:bg-white/5 active:scale-95 transition-all"
            aria-label="Open navigation menu"
          >
            <Menu size={24} strokeWidth={2.2} />
          </button>

          <button
            onClick={() => setIsNotifOpen(true)}
            className="p-2 -mr-2 rounded-xl text-white hover:bg-white/5 active:scale-95 transition-all relative"
            aria-label="View notifications"
          >
            <Bell size={22} strokeWidth={2.2} />
            {routines.some((r) => r.is_active === 1) && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand-purple shadow-glow-purple-sm animate-pulse" />
            )}
          </button>
        </header>

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mt-1">
          {/* Top Circular Glow Icon */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#2D1B69] to-[#1A123B] border border-brand-purple/40 flex items-center justify-center mb-3 shadow-glow-purple-sm">
            <CalendarIcon size={24} className="text-brand-accent" strokeWidth={2} />
          </div>

          {/* Title & Subtitle */}
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            Routine Planner
          </h1>
          <p className="text-xs text-text-secondary max-w-[260px] leading-relaxed">
            Create your daily routine for a date range
          </p>

          {/* Centered Calendar & Clock 3D Illustration */}
          <CalendarIllustration />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3 mt-4">
          {/* Primary Button: Create Routine */}
          <button
            onClick={() => navigate('/create')}
            className="w-full h-13 py-3.5 px-6 rounded-2xl bg-purple-gradient text-white font-semibold text-base flex items-center justify-center space-x-2 shadow-glow-purple hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Create Routine</span>
          </button>

          {/* Secondary Button: My Routines */}
          <button
            onClick={() => navigate('/routines')}
            className="w-full h-13 py-3.5 px-6 rounded-2xl bg-[#1D1D34] hover:bg-[#252542] border border-white/5 text-white font-medium text-base flex items-center justify-center space-x-2.5 active:scale-[0.98] transition-all"
          >
            <List size={20} strokeWidth={2.2} />
            <span>My Routines</span>
          </button>
        </div>

        {/* Quick Stats */}
        <QuickStats
          stats={stats}
          onClickRoutines={() => navigate('/routines')}
          onClickCalendar={() => navigate('/calendar')}
        />
      </div>

      {/* Drawer & Modal */}
      <DrawerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <NotificationModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </div>
  );
};

