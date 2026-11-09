import React from 'react';
import { Calendar, Clock, CalendarCheck } from 'lucide-react';
import { RoutineStats } from '@/models/routine';

interface QuickStatsProps {
  stats: RoutineStats;
  onClickRoutines?: () => void;
  onClickCalendar?: () => void;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ stats, onClickRoutines, onClickCalendar }) => {
  return (
    <div className="w-full mt-6">
      <h3 className="text-sm font-bold text-white mb-3">Quick Stats</h3>
      <div className="grid grid-cols-3 gap-3">
        {/* Card 1: Routines */}
        <div
          onClick={onClickRoutines}
          className="bg-surface border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-purple/40 transition-all active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-brand-purple/15 flex items-center justify-center mb-1.5 text-brand-accent">
            <Calendar size={18} strokeWidth={2.2} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight leading-none mb-1">
            {stats.totalRoutines}
          </span>
          <span className="text-[11px] text-text-muted font-medium">Routines</span>
        </div>

        {/* Card 2: Time Slots */}
        <div
          onClick={onClickRoutines}
          className="bg-surface border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-purple/40 transition-all active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center mb-1.5 text-sky-400">
            <Clock size={18} strokeWidth={2.2} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight leading-none mb-1">
            {stats.totalTimeSlots}
          </span>
          <span className="text-[11px] text-text-muted font-medium">Time Slots</span>
        </div>

        {/* Card 3: Active Days */}
        <div
          onClick={onClickCalendar}
          className="bg-surface border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-purple/40 transition-all active:scale-95"
        >
          <div className="w-8 h-8 rounded-xl bg-status-success/15 flex items-center justify-center mb-1.5 text-status-success">
            <CalendarCheck size={18} strokeWidth={2.2} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight leading-none mb-1">
            {stats.activeDays}
          </span>
          <span className="text-[11px] text-text-muted font-medium">Active Days</span>
        </div>
      </div>
    </div>
  );
};

