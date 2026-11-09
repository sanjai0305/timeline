import React, { useState, useEffect } from 'react';
import { X, Clock, Check, AlertCircle, Bell, BellOff } from 'lucide-react';
import { CreateTimeSlotInput, ReminderMinutesBefore } from '@/models/time-slot';
import { CategoryId, CATEGORIES } from '@/models/category';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { validateTimeRange, parseTimeToMinutes, formatMinutesToTime } from '@/utils/date';
import { backButtonService } from '@/services/backButtonService';
import { ClockTimePickerModal } from '@/components/time-picker/ClockTimePickerModal';
import { openNativeClockTimePicker } from '@/services/timePickerService';

interface TimeSlotModalProps {
  isOpen: boolean;
  initialData?: CreateTimeSlotInput | null;
  existingSlots: CreateTimeSlotInput[];
  editingIndex?: number | null;
  onClose: () => void;
  onSave: (slot: CreateTimeSlotInput) => void;
}

export const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  isOpen,
  initialData,
  existingSlots,
  editingIndex,
  onClose,
  onSave,
}) => {
  const [activityName, setActivityName] = useState('');
  const [startTime, setStartTime] = useState('06:00 AM');
  const [endTime, setEndTime] = useState('07:00 AM');
  const [category, setCategory] = useState<CategoryId>('study');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<ReminderMinutesBefore>(10);
  const [error, setError] = useState<string | null>(null);
  const [clockPickerTarget, setClockPickerTarget] = useState<'start' | 'end' | null>(null);

  const handleOpenTimePicker = async (target: 'start' | 'end') => {
    const currentTime = target === 'start' ? startTime : endTime;
    const title = target === 'start' ? 'Select Start Time' : 'Select End Time';

    const nativeRes = await openNativeClockTimePicker(title, currentTime);
    if (nativeRes) {
      if (!nativeRes.cancelled) {
        if (target === 'start') {
          setStartTime(nativeRes.formatted12);
        } else {
          setEndTime(nativeRes.formatted12);
        }
      }
      return;
    }

    setClockPickerTarget(target);
  };

  useEffect(() => {
    if (initialData) {
      setActivityName(initialData.activity_name);
      setStartTime(initialData.start_time);
      setEndTime(initialData.end_time);
      setCategory(initialData.category);
      setReminderEnabled(initialData.reminder_enabled !== false);
      setReminderMinutesBefore(
        typeof initialData.reminder_minutes_before === 'number'
          ? initialData.reminder_minutes_before
          : 10
      );
    } else {
      // Suggest next slot based on existing slots
      if (existingSlots.length > 0) {
        const lastSlot = existingSlots[existingSlots.length - 1];
        const lastEndMin = parseTimeToMinutes(lastSlot.end_time);
        const newStartMin = Math.min(1410, lastEndMin);
        const newEndMin = Math.min(1439, newStartMin + 60);
        setStartTime(formatMinutesToTime(newStartMin));
        setEndTime(formatMinutesToTime(newEndMin));
      } else {
        setStartTime('05:00 AM');
        setEndTime('06:00 AM');
      }
      setActivityName('');
      setCategory('study');
      setReminderEnabled(true);
      setReminderMinutesBefore(10);
    }
    setError(null);
  }, [initialData, existingSlots, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const unregister = backButtonService.registerModal(() => {
      onClose();
      return true;
    });
    return unregister;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!activityName.trim()) {
      setError('Activity name is required');
      return;
    }

    const timeRangeErr = validateTimeRange(startTime, endTime);
    if (timeRangeErr) {
      setError(timeRangeErr);
      return;
    }

    // Check overlap with other slots
    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    for (let i = 0; i < existingSlots.length; i++) {
      if (editingIndex !== null && editingIndex !== undefined && editingIndex === i) {
        continue;
      }
      const other = existingSlots[i];
      const otherStart = parseTimeToMinutes(other.start_time);
      const otherEnd = parseTimeToMinutes(other.end_time);

      if (startMin < otherEnd && endMin > otherStart) {
        setError(`Overlaps with existing slot "${other.activity_name}" (${other.start_time} - ${other.end_time})`);
        return;
      }
    }

    const categoryDef = CATEGORIES[category];
    onSave({
      activity_name: activityName.trim(),
      start_time: startTime,
      end_time: endTime,
      category,
      icon: categoryDef.icon,
      sort_order: startMin,
      reminder_enabled: reminderEnabled,
      reminder_minutes_before: reminderMinutesBefore,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-[#181830] border border-white/10 rounded-3xl p-5 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent">
              <Clock size={18} />
            </div>
            <h3 className="font-bold text-white text-base">
              {initialData ? 'Edit Time Slot' : 'Add Time Slot'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2 text-status-danger text-xs">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity Name */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Activity Name *
            </label>
            <input
              type="text"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="e.g. Morning Study, Exercise, Lunch"
              className="w-full bg-[#131326] border border-white/10 focus:border-brand-purple rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-text-muted/60 focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          {/* Clock-Style Time Range Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Start Time
              </label>
              <button
                type="button"
                onClick={() => handleOpenTimePicker('start')}
                className="w-full bg-[#131326] border border-white/10 hover:border-brand-purple/70 focus:border-brand-purple rounded-xl px-3 py-2.5 text-sm text-white flex items-center justify-between transition-all group"
              >
                <span className="font-semibold text-white tracking-wide">{startTime}</span>
                <Clock size={16} className="text-brand-accent group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                End Time
              </label>
              <button
                type="button"
                onClick={() => handleOpenTimePicker('end')}
                className="w-full bg-[#131326] border border-white/10 hover:border-brand-purple/70 focus:border-brand-purple rounded-xl px-3 py-2.5 text-sm text-white flex items-center justify-between transition-all group"
              >
                <span className="font-semibold text-white tracking-wide">{endTime}</span>
                <Clock size={16} className="text-brand-accent group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(CATEGORIES) as CategoryId[]).map((catId) => {
                const def = CATEGORIES[catId];
                const isSelected = category === catId;
                return (
                  <button
                    key={catId}
                    type="button"
                    onClick={() => setCategory(catId)}
                    className={`flex items-center space-x-1.5 p-2 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-brand-purple/25 border-brand-accent text-white shadow-sm'
                        : 'bg-[#131326] border-white/5 text-text-muted hover:text-white hover:border-white/20'
                    }`}
                  >
                    <CategoryIcon category={catId} size={15} />
                    <span className="truncate">{def.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Local Reminder Settings */}
          <div className="bg-[#131326] p-3 rounded-2xl border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${reminderEnabled ? 'bg-brand-purple/20 text-brand-accent' : 'bg-white/5 text-text-muted'}`}>
                  {reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                </div>
                <div>
                  <span className="text-xs font-semibold text-white">Local Alarm Reminder</span>
                  <p className="text-[10px] text-text-muted">Device notification before activity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  reminderEnabled ? 'bg-brand-purple' : 'bg-surface-secondary'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {reminderEnabled && (
              <div className="pt-1 border-t border-white/5">
                <label className="block text-[11px] font-medium text-text-secondary mb-1.5">
                  Remind me:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { value: 0 as ReminderMinutesBefore, label: 'At start' },
                    { value: 5 as ReminderMinutesBefore, label: '5m before' },
                    { value: 10 as ReminderMinutesBefore, label: '10m before' },
                    { value: 15 as ReminderMinutesBefore, label: '15m before' },
                    { value: 30 as ReminderMinutesBefore, label: '30m before' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReminderMinutesBefore(opt.value)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition-all ${
                        reminderMinutesBefore === opt.value
                          ? 'bg-brand-purple/25 border-brand-accent text-brand-accent font-semibold'
                          : 'bg-surface border-white/5 text-text-muted hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-secondary text-sm font-medium text-text-secondary hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-purple-gradient text-white text-sm font-semibold flex items-center justify-center space-x-1.5 shadow-glow-purple-sm hover:opacity-95 active:scale-95 transition-all"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{initialData ? 'Update' : 'Add Slot'}</span>
            </button>
          </div>
        </form>
      </div>

      <ClockTimePickerModal
        isOpen={clockPickerTarget !== null}
        title={clockPickerTarget === 'start' ? 'Select Start Time' : 'Select End Time'}
        initialTime={clockPickerTarget === 'start' ? startTime : endTime}
        onClose={() => setClockPickerTarget(null)}
        onSelectTime={(time12) => {
          if (clockPickerTarget === 'start') {
            setStartTime(time12);
          } else {
            setEndTime(time12);
          }
          setClockPickerTarget(null);
        }}
      />
    </div>
  );
};

