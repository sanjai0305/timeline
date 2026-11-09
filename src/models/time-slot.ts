import { CategoryId } from './category';

export type ReminderMinutesBefore = 0 | 5 | 10 | 15 | 30;

export interface TimeSlot {
  id: string;
  routine_id: string;
  start_time: string; // e.g. "05:00 AM" or "05:00"
  end_time: string;   // e.g. "06:00 AM" or "06:00"
  activity_name: string;
  category: CategoryId;
  icon: string;
  sort_order: number;
  reminder_enabled?: boolean; // Default true
  reminder_minutes_before?: ReminderMinutesBefore; // Default 10
  created_at: string;
  updated_at: string;
}

export type CreateTimeSlotInput = Omit<TimeSlot, 'id' | 'routine_id' | 'created_at' | 'updated_at'>;

export interface DailyActivityItem {
  id: string;
  timeSlotId: string;
  routineId: string;
  routineName: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  activityName: string;
  category: CategoryId;
  icon: string;
  sortOrder: number;
}

