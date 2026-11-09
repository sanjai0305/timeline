import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { useRoutineStore } from '@/store/routineStore';
import { formatToYMD, formatDisplayDate, isDateInRange, sortSlotsByStartTime } from '@/utils/date';
import { CategoryIcon } from '@/components/common/CategoryIcon';

export const CalendarScreen: React.FC = () => {
  const navigate = useNavigate();
  const { routines, fetchRoutines } = useRoutineStore();

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 10, 10)); // Default to Nov 2026 to showcase reference
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 10, 10));

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const selectedDateStr = formatToYMD(selectedDate);

  // Find all active routines that cover the selected date
  const activeRoutinesForDate = routines.filter(
    (r) => r.is_active === 1 && isDateInRange(selectedDateStr, r.start_date, r.end_date)
  );

  // Collect and sort all time slots from active routines covering this date
  const daySlots = activeRoutinesForDate.flatMap((r) =>
    r.slots.map((s) => ({
      ...s,
      routineName: r.name,
      routineId: r.id,
    }))
  );
  const sortedDaySlots = sortSlotsByStartTime(daySlots);

  // Month navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Calendar grid generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="min-h-screen bg-background text-text-primary px-5 pt-3 pb-24 flex flex-col justify-between max-w-md mx-auto relative">
      <div>
        {/* Header */}
        <header className="flex items-center justify-between py-2 mb-3">
          <h1 className="text-xl font-bold text-white tracking-tight">Calendar</h1>
          <button
            onClick={goToToday}
            className="px-3 py-1 rounded-xl bg-surface border border-white/10 text-xs font-medium text-brand-accent hover:border-brand-purple/40 active:scale-95 transition-all"
          >
            Today
          </button>
        </header>

        {/* Month Navigation Card */}
        <div className="bg-surface rounded-3xl p-4 border border-white/5 shadow-card mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white tracking-tight">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 active:scale-90 transition-all"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 active:scale-90 transition-all"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="text-[11px] font-semibold text-text-muted">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dayStr = formatToYMD(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);

              // Check if any active routine covers this day
              const hasActiveRoutine = routines.some(
                (r) => r.is_active === 1 && isDateInRange(dayStr, r.start_date, r.end_date)
              );

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-95 ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  } ${
                    isSelected
                      ? 'bg-purple-gradient text-white font-bold shadow-glow-purple-sm ring-2 ring-brand-accent'
                      : isCurrentDay
                      ? 'bg-brand-purple/20 text-brand-accent font-semibold border border-brand-purple/30'
                      : hasActiveRoutine
                      ? 'bg-[#22223D] text-white hover:bg-[#2A2A4A]'
                      : 'text-text-muted hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs leading-none">{format(day, 'd')}</span>

                  {/* Dot indicator if covered by active routine */}
                  {hasActiveRoutine && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent absolute bottom-1 shadow-glow-purple-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Timetable Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-brand-purple" />
              <h3 className="text-sm font-bold text-white">
                {formatDisplayDate(selectedDateStr)}
              </h3>
            </div>
            <span className="text-xs text-text-muted">
              {activeRoutinesForDate.length} {activeRoutinesForDate.length === 1 ? 'routine' : 'routines'}
            </span>
          </div>

          {/* Active Routines Pill Chips */}
          {activeRoutinesForDate.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeRoutinesForDate.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/routines/${r.id}`)}
                  className="px-3 py-1.5 rounded-xl bg-hero-gradient border border-brand-purple/30 text-white text-xs font-semibold flex items-center space-x-1.5 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                >
                  <CalendarIcon size={13} />
                  <span>{r.name}</span>
                  <ArrowUpRight size={13} className="text-brand-accent" />
                </button>
              ))}
            </div>
          )}

          {/* Daily Schedule List */}
          <div className="space-y-2.5">
            {sortedDaySlots.length > 0 ? (
              sortedDaySlots.map((slot, index) => (
                <div
                  key={`${slot.id || index}`}
                  className="bg-surface border border-white/5 rounded-2xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <CategoryIcon category={slot.category} name={slot.icon} size={18} />
                    </div>
                    <div>
                      <div className="text-xs text-text-muted font-medium">
                        {slot.start_time} – {slot.end_time}
                      </div>
                      <div className="text-sm font-semibold text-white tracking-tight">
                        {slot.activity_name}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted bg-white/5 px-2 py-0.5 rounded-md">
                    {slot.routineName}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center rounded-2xl bg-surface/50 border border-white/5 flex flex-col items-center">
                <Clock size={28} className="text-text-muted/60 mb-2" />
                <p className="text-xs font-medium text-white">No timetable for this date</p>
                <p className="text-[11px] text-text-muted mt-0.5 mb-3">
                  Create a routine that covers {formatDisplayDate(selectedDateStr)}.
                </p>
                <button
                  onClick={() => navigate('/create')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-gradient text-white text-xs font-semibold flex items-center space-x-1.5 shadow-glow-purple-sm active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  <span>Create Routine</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
