import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Bell,
} from 'lucide-react';
import { useRoutineStore } from '@/store/routineStore';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { formatDateRange, formatDisplayDate, getDaysInRange } from '@/utils/date';
import { ShareModal } from '@/components/routine/ShareModal';
import { backButtonService } from '@/services/backButtonService';

export const RoutineDetailsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    fetchRoutineById,
    toggleActive,
    deleteRoutine,
    fetchMembers,
    subscribeToRealtimeTimeline,
    selectedRoutine,
  } = useRoutineStore();

  const [activeTab, setActiveTab] = useState<'routine' | 'calendar'>('routine');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');

  useEffect(() => {
    if (!isMenuOpen) return;
    return backButtonService.registerModal(() => {
      setIsMenuOpen(false);
      return true;
    });
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isDeleteModalOpen) return;
    return backButtonService.registerModal(() => {
      setIsDeleteModalOpen(false);
      return true;
    });
  }, [isDeleteModalOpen]);

  // Initial fetch and Realtime Firestore synchronization
  useEffect(() => {
    if (id) {
      fetchRoutineById(id).then((data) => {
        if (data) {
          setSelectedCalendarDate(data.start_date);
        }
      });
      fetchMembers(id);

      // Start Real-Time Firestore Sync
      const unsubscribe = subscribeToRealtimeTimeline(id);
      return () => {
        unsubscribe();
      };
    }
  }, [id, fetchRoutineById, fetchMembers, subscribeToRealtimeTimeline]);

  const routine = selectedRoutine;

  if (!routine) {
    return (
      <div className="min-h-screen bg-background text-text-primary px-5 pt-8 flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="w-10 h-10 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-text-muted">Loading routine...</p>
      </div>
    );
  }

  const isOwner = routine.role === 'owner' || !routine.role;
  const isViewer = routine.role === 'viewer';

  const handleToggleActive = async () => {
    if (!id) return;
    await toggleActive(id);
    await fetchRoutineById(id);
    setIsMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    const ok = await deleteRoutine(id);
    if (ok) {
      navigate('/routines');
    }
  };

  const daysInRange = getDaysInRange(routine.start_date, routine.end_date);

  return (
    <div className="min-h-screen bg-background text-text-primary px-5 pt-3 pb-24 flex flex-col justify-between max-w-md mx-auto relative">
      <div>
        {/* Header matching Screen 3 */}
        <header className="flex items-center justify-between py-2 mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button
              onClick={() => navigate('/routines')}
              className="p-2 -ml-2 rounded-xl text-white hover:bg-white/5 active:scale-95 transition-all"
              aria-label="Go back"
            >
              <ArrowLeft size={22} strokeWidth={2.2} />
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight truncate">
              {routine.name}
            </h1>
          </div>

          <div className="flex items-center space-x-1 relative">
            {/* Collaborate / Share Button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 rounded-xl text-brand-accent hover:text-white hover:bg-white/5 active:scale-95 transition-all"
              aria-label="Collaborate & Share"
              title="Collaborate & Share"
            >
              <Users size={18} strokeWidth={2.2} />
            </button>

            {!isViewer && (
              <button
                onClick={() => navigate(`/routines/${routine.id}/edit`)}
                className="p-2 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                aria-label="Edit routine"
              >
                <Pencil size={18} strokeWidth={2.2} />
              </button>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 -mr-2 rounded-xl text-text-secondary hover:text-white hover:bg-white/5 active:scale-95 transition-all"
              aria-label="More options"
            >
              <MoreHorizontal size={22} strokeWidth={2.2} />
            </button>

            {/* Kebab Dropdown Menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-12 w-48 bg-[#1A1A33] border border-white/10 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsShareModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-text-primary hover:bg-white/5 transition-colors"
                  >
                    <Users size={15} className="text-brand-accent" />
                    <span>Collaborators & Invite</span>
                  </button>

                  {!isViewer && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate(`/routines/${routine.id}/edit`);
                      }}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-text-primary hover:bg-white/5 transition-colors"
                    >
                      <Pencil size={15} className="text-brand-accent" />
                      <span>Edit Routine</span>
                    </button>
                  )}

                  {!isViewer && (
                    <button
                      onClick={handleToggleActive}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-text-primary hover:bg-white/5 transition-colors"
                    >
                      {routine.is_active === 1 ? (
                        <>
                          <XCircle size={15} className="text-text-muted" />
                          <span>Deactivate</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} className="text-status-success" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                  )}

                  {isOwner && (
                    <>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsDeleteModalOpen(true);
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium text-status-danger hover:bg-status-danger/10 transition-colors"
                      >
                        <Trash2 size={15} />
                        <span>Delete Routine</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Routine Information Hero Card matching Screen 3 */}
        <div className="w-full rounded-3xl bg-hero-gradient p-4 border border-brand-purple/30 shadow-glow-purple-sm flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3.5 flex-1 min-w-0">
            {/* Calendar Icon Box */}
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <CalendarIcon size={24} className="text-white" strokeWidth={2} />
            </div>

            {/* Name and Date */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight truncate leading-tight">
                  {routine.name}
                </h2>
                {routine.role && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-bold bg-white/15 text-indigo-200">
                    {routine.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5 truncate font-medium">
                {formatDateRange(routine.start_date, routine.end_date)}
              </p>
            </div>
          </div>

          {/* Active Status Badge */}
          <div className="pl-2 flex-shrink-0">
            {routine.is_active === 1 ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-status-success/20 text-status-success border border-status-success/40">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-text-muted border border-white/10">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher: Routine vs Calendar */}
        <div className="w-full bg-[#181830] p-1 rounded-2xl border border-white/5 flex items-center mb-5">
          <button
            onClick={() => setActiveTab('routine')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'routine'
                ? 'bg-brand-purple/20 text-brand-accent shadow-glow-purple-sm border border-brand-purple/40'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <CalendarIcon size={15} />
            <span>Routine</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'calendar'
                ? 'bg-brand-purple/20 text-brand-accent shadow-glow-purple-sm border border-brand-purple/40'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <CalendarIcon size={15} />
            <span>Calendar</span>
          </button>
        </div>

        {activeTab === 'routine' ? (
          <div>
            {/* Daily Timetable Section Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Clock size={18} className="text-brand-purple" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-white">Daily Timetable</h3>
              </div>
              <span className="text-[11px] text-text-muted flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse inline-block" />
                <span>Live Sync</span>
              </span>
            </div>

            {/* Vertical Timeline View matching Screen 3 */}
            <div className="relative pl-6 space-y-4">
              {/* Purple Vertical Timeline Bar */}
              <div className="absolute left-[7px] top-3 bottom-3 w-[2.5px] bg-brand-purple/60 shadow-glow-purple-sm rounded-full" />

              {routine.slots.map((slot: any) => (
                <div key={slot.id} className="relative flex items-center">
                  {/* Circular Timeline Indicator Bead */}
                  <div className="absolute -left-[23.5px] w-4 h-4 rounded-full bg-brand-purple border-2 border-background flex items-center justify-center shadow-glow-purple-sm z-10" />

                  {/* Activity Card */}
                  <div className="w-full bg-surface border border-white/5 hover:border-brand-purple/30 rounded-2xl p-3 flex items-center space-x-3 transition-all">
                    {/* Category Icon */}
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon category={slot.category} name={slot.icon} size={20} />
                    </div>

                    {/* Time & Activity Name */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted font-medium">
                          {slot.start_time} – {slot.end_time}
                        </span>
                        {slot.reminder_enabled !== false && (
                          <span
                            title={`Local reminder ${slot.reminder_minutes_before ?? 10}m before`}
                            className="inline-flex items-center text-[10px] text-brand-accent bg-brand-purple/15 px-1.5 py-0.5 rounded-full"
                          >
                            <Bell size={10} className="mr-0.5" />
                            {slot.reminder_minutes_before === 0 ? 'At start' : `${slot.reminder_minutes_before ?? 10}m`}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-white tracking-tight truncate mt-0.5">
                        {slot.activity_name}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Calendar Tab: Date Picker and Timetable for this Routine */
          <div className="space-y-4">
            <div>
              <p className="text-xs text-text-muted mb-2 font-medium">
                Select a date in this routine&apos;s active range to inspect:
              </p>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                {daysInRange.map((dateStr) => {
                  const isSelected = selectedCalendarDate === dateStr;
                  const dayObj = new Date(dateStr);
                  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayObj.getDay()];
                  const dayNum = dateStr.split('-')[2];

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedCalendarDate(dateStr)}
                      className={`flex flex-col items-center justify-center min-w-[50px] py-2.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-purple-gradient text-white border-brand-accent shadow-glow-purple-sm scale-105'
                          : 'bg-surface border-white/5 text-text-muted hover:border-white/20'
                      }`}
                    >
                      <span className="text-[10px] font-medium uppercase">{dayName}</span>
                      <span className="text-sm font-bold mt-0.5">{dayNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-white/5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                <span className="text-xs font-semibold text-white">
                  Timetable for {formatDisplayDate(selectedCalendarDate)}
                </span>
                <span className="text-[11px] text-brand-accent">
                  {routine.slots.length} Activities
                </span>
              </div>

              <div className="space-y-2">
                {routine.slots.map((slot: any) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-xl bg-white/[0.02]"
                  >
                    <div className="flex items-center space-x-2">
                      <CategoryIcon category={slot.category} name={slot.icon} size={15} />
                      <span className="text-xs font-medium text-white">{slot.activity_name}</span>
                    </div>
                    <span className="text-[11px] text-text-muted font-medium">
                      {slot.start_time} - {slot.end_time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          <div className="relative w-full max-w-xs bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-status-danger/15 text-status-danger flex items-center justify-center mx-auto mb-3">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-base font-bold text-white text-center mb-1">
              Delete Routine?
            </h3>
            <p className="text-xs text-text-muted text-center mb-5">
              Are you sure you want to delete &quot;{routine.name}&quot;? All associated time slots and collaborator access will be removed.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-secondary text-xs font-medium text-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-status-danger text-white text-xs font-semibold hover:opacity-95 transition-all shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration / Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        timelineId={routine.id}
        timelineName={routine.name}
        startDate={routine.start_date}
        endDate={routine.end_date}
        userRole={routine.role || 'owner'}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
