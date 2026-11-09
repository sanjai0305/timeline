import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, ShieldAlert } from 'lucide-react';
import { notificationService, ActiveAlarmInfo } from '@/services/notificationService';
import { backButtonService } from '@/services/backButtonService';

export const ActiveAlarmModal: React.FC = () => {
  const [activeInfo, setActiveInfo] = useState<ActiveAlarmInfo | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  // Poll for active alarm state while app is in foreground
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        const info = await notificationService.getActiveAlarm();
        if (isMounted) {
          if (info.isActive) {
            setActiveInfo(info);
          } else {
            setActiveInfo(null);
          }
        }
      } catch {
        // Ignored
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Handle back button when modal is active: pressing back stops the alarm
  useEffect(() => {
    if (!activeInfo?.isActive) return;
    const unregister = backButtonService.registerModal(() => {
      handleStop();
      return true;
    });
    return unregister;
  }, [activeInfo]);

  if (!activeInfo || !activeInfo.isActive) return null;

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await notificationService.stopActiveAlarm();
      setActiveInfo(null);
    } finally {
      setIsStopping(false);
    }
  };

  const isEnd = activeInfo.eventType === 'END';
  const isGrouped = activeInfo.eventType === 'GROUPED' || !!activeInfo.groupedDesc;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-[#181830] border-2 border-brand-purple rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
        {/* Pulsing Alarm Icon Badge */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-brand-purple/30 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-brand-purple to-indigo-600 flex items-center justify-center text-white shadow-glow-purple">
            <Bell size={32} className="animate-bounce" />
          </div>
        </div>

        {/* Routine & Activity Details */}
        <div>
          <span className="text-[11px] font-bold tracking-widest text-brand-accent uppercase">
            {activeInfo.routineName || 'ROUTINE PLANNER'}
          </span>
          <h2 className="text-xl font-extrabold text-white mt-1 leading-tight">
            {isGrouped
              ? activeInfo.groupedDesc || activeInfo.activityName
              : activeInfo.activityName}
          </h2>
          <p className="text-xs font-semibold text-indigo-200/90 mt-1">
            {isGrouped
              ? 'Simultaneous Activities Scheduled'
              : isEnd
              ? 'Activity Time Finished!'
              : 'Activity Started!'}
          </p>
        </div>

        {/* Time display */}
        <div className="flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-white/[0.04] border border-white/10 w-fit mx-auto">
          <Clock size={15} className="text-brand-accent" />
          <span className="text-xs font-bold text-white tracking-wide">
            {activeInfo.startTime && activeInfo.endTime
              ? `${activeInfo.startTime} – ${activeInfo.endTime}`
              : activeInfo.startTime || activeInfo.endTime || 'Now'}
          </span>
        </div>

        {/* Repeating Cycle Notice */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-text-muted flex items-center justify-center space-x-1.5">
          <ShieldAlert size={14} className="text-amber-400 flex-shrink-0" />
          <span>Repeating 3m Ring / 2m Silence until stopped</span>
        </div>

        {/* Big STOP ALARM Button */}
        <button
          type="button"
          onClick={handleStop}
          disabled={isStopping}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-extrabold text-base tracking-wider uppercase shadow-lg shadow-red-600/40 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center space-x-2"
        >
          <BellOff size={20} />
          <span>{isStopping ? 'STOPPING...' : 'STOP ALARM'}</span>
        </button>
      </div>
    </div>
  );
};

