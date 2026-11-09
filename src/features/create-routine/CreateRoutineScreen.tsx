import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Calendar, Clock, Plus, Trash2, Check, AlertCircle, Bell } from 'lucide-react';
import { useRoutineStore } from '@/store/routineStore';
import { CreateTimeSlotInput } from '@/models/time-slot';
import { TimeSlotModal } from '@/components/routine/TimeSlotModal';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { formatDisplayDate, sortSlotsByStartTime, findSlotOverlap } from '@/utils/date';

export const CreateRoutineScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const { createRoutine, updateRoutine, fetchRoutineById } = useRoutineStore();

  const [routineName, setRoutineName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [slots, setSlots] = useState<CreateTimeSlotInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Time slot modal state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  // Load existing routine if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      fetchRoutineById(id).then((routine) => {
        if (routine) {
          setRoutineName(routine.name);
          setStartDate(routine.start_date);
          setEndDate(routine.end_date);
          setSlots(
            routine.slots.map((s) => ({
              start_time: s.start_time,
              end_time: s.end_time,
              activity_name: s.activity_name,
              category: s.category,
              icon: s.icon,
              sort_order: s.sort_order,
              reminder_enabled: s.reminder_enabled !== false,
              reminder_minutes_before: s.reminder_minutes_before ?? 10,
            }))
          );
        }
        setIsLoading(false);
      });
    } else {
      setSlots([]);
    }
  }, [id, isEditMode, fetchRoutineById]);

  const handleOpenAddSlot = () => {
    setEditingSlotIndex(null);
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (index: number) => {
    setEditingSlotIndex(index);
    setIsSlotModalOpen(true);
  };

  const handleDeleteSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSlot = (slot: CreateTimeSlotInput) => {
    if (editingSlotIndex !== null) {
      setSlots((prev) => {
        const updated = [...prev];
        updated[editingSlotIndex] = slot;
        return sortSlotsByStartTime(updated);
      });
    } else {
      setSlots((prev) => sortSlotsByStartTime([...prev, slot]));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!routineName.trim()) {
      setError('Routine name is required');
      return;
    }

    if (!startDate) {
      setError('Start date is required');
      return;
    }

    if (!endDate) {
      setError('End date is required');
      return;
    }

    if (endDate < startDate) {
      setError('End date must be equal to or later than the start date');
      return;
    }

    if (slots.length === 0) {
      setError('At least one time slot is required');
      return;
    }

    // Overlap validation
    const overlapErr = findSlotOverlap(slots);
    if (overlapErr) {
      setError(overlapErr);
      return;
    }

    try {
      setIsLoading(true);
      const sortedSlots = sortSlotsByStartTime(slots);

      if (isEditMode && id) {
        const updated = await updateRoutine(id, {
          name: routineName.trim(),
          start_date: startDate,
          end_date: endDate,
          slots: sortedSlots,
        });
        navigate(`/routines/${updated.id}`);
      } else {
        const created = await createRoutine({
          name: routineName.trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: true,
          slots: sortedSlots,
        });
        navigate(`/routines/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save routine');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary px-5 pt-3 pb-28 flex flex-col justify-between max-w-md mx-auto relative">
      <div>
        {/* Header */}
        <header className="flex items-center space-x-4 py-2 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl text-white hover:bg-white/5 active:scale-95 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft size={22} strokeWidth={2.2} />
          </button>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isEditMode ? 'Edit Routine' : 'Create Routine'}
          </h1>
        </header>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-status-danger/10 border border-status-danger/30 flex items-start space-x-2.5 text-status-danger text-xs leading-relaxed animate-in fade-in duration-200">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form id="routine-form" onSubmit={handleFormSubmit} className="space-y-4">
          {/* Routine Name Input */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Routine Name
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-text-muted pointer-events-none">
                <Pencil size={18} />
              </div>
              <input
                type="text"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder="My Study Routine"
                className="w-full h-12 bg-surface border border-white/10 focus:border-brand-purple rounded-2xl pl-11 pr-4 text-sm font-medium text-white placeholder-text-muted/60 focus:outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Start Date & End Date Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Start Date
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-brand-purple pointer-events-none">
                  <Calendar size={17} />
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-12 bg-surface border border-white/10 focus:border-brand-purple rounded-2xl pl-10 pr-2 text-xs font-medium text-white focus:outline-none cursor-pointer [color-scheme:dark]"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1 px-1">
                {formatDisplayDate(startDate)}
              </p>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                End Date
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-brand-purple pointer-events-none">
                  <Calendar size={17} />
                </div>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-12 bg-surface border border-white/10 focus:border-brand-purple rounded-2xl pl-10 pr-2 text-xs font-medium text-white focus:outline-none cursor-pointer [color-scheme:dark]"
                  required
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1 px-1">
                {formatDisplayDate(endDate)}
              </p>
            </div>
          </div>

          {/* Time Slots Section Header */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock size={18} className="text-brand-purple" strokeWidth={2.2} />
                <h3 className="text-sm font-bold text-white">Time Slots</h3>
              </div>

              <button
                type="button"
                onClick={handleOpenAddSlot}
                className="h-8 px-3 rounded-full bg-brand-darkPurple hover:bg-brand-purple text-white text-xs font-semibold flex items-center space-x-1.5 shadow-glow-pill active:scale-95 transition-all"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add Time Slot</span>
              </button>
            </div>

            {/* Time Slots List matching Screen 2 */}
            <div className="space-y-2.5">
              {slots.length > 0 ? (
                slots.map((slot, index) => (
                  <div
                    key={`${slot.start_time}-${slot.end_time}-${index}`}
                    className="h-13 bg-surface border border-white/5 hover:border-brand-purple/30 rounded-2xl px-3.5 flex items-center justify-between transition-all"
                  >
                    {/* Time Range */}
                    <div className="text-xs font-medium text-white tracking-tight w-32 flex-shrink-0">
                      {slot.start_time} – {slot.end_time}
                    </div>

                    {/* Category Icon & Activity Name */}
                    <div className="flex items-center space-x-2 flex-1 min-w-0 px-1">
                      <CategoryIcon
                        category={slot.category}
                        name={slot.icon}
                        size={17}
                        className="flex-shrink-0"
                      />
                      <span className="text-xs font-medium text-white truncate">
                        {slot.activity_name}
                      </span>
                      {slot.reminder_enabled !== false && (
                        <span
                          title={`Reminder ${slot.reminder_minutes_before ?? 10}m before`}
                          className="flex items-center text-[10px] text-brand-accent bg-brand-purple/20 px-1.5 py-0.5 rounded-md flex-shrink-0"
                        >
                          <Bell size={10} className="mr-0.5" />
                          {slot.reminder_minutes_before === 0 ? 'Start' : `${slot.reminder_minutes_before ?? 10}m`}
                        </span>
                      )}
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div className="flex items-center space-x-1 flex-shrink-0 pl-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSlot(index)}
                        className="p-1.5 text-text-muted hover:text-white rounded-lg active:scale-90 transition-transform"
                        aria-label="Edit time slot"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSlot(index)}
                        className="p-1.5 text-status-danger/80 hover:text-status-danger rounded-lg active:scale-90 transition-transform"
                        aria-label="Delete time slot"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center rounded-2xl bg-surface/50 border border-dashed border-white/10">
                  <Clock size={28} className="mx-auto text-text-muted mb-2 opacity-50" />
                  <p className="text-xs font-medium text-text-secondary">No time slots added yet</p>
                  <p className="text-[11px] text-text-muted mt-0.5">Click "+ Add Time Slot" above</p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Fixed Bottom Action Button matching Screen 2 */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background/95 to-transparent z-40 max-w-md mx-auto">
        <button
          type="submit"
          form="routine-form"
          disabled={isLoading}
          className="w-full h-13 py-3.5 px-6 rounded-2xl bg-purple-gradient text-white font-semibold text-base flex items-center justify-center space-x-2 shadow-glow-purple hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Check size={20} strokeWidth={2.8} />
          <span>{isEditMode ? 'Update Routine' : 'Create Routine'}</span>
        </button>
      </div>

      {/* Add / Edit Time Slot Modal */}
      <TimeSlotModal
        isOpen={isSlotModalOpen}
        initialData={editingSlotIndex !== null ? slots[editingSlotIndex] : null}
        existingSlots={slots}
        editingIndex={editingSlotIndex}
        onClose={() => setIsSlotModalOpen(false)}
        onSave={handleSaveSlot}
      />
    </div>
  );
};
