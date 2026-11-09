import { TimeSlot, CreateTimeSlotInput } from './time-slot';

export interface Routine {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  is_active: number;  // 1 for active, 0 for inactive
  created_at: string;
  updated_at: string;
  role?: 'owner' | 'editor' | 'viewer';
  ownerId?: string;
  memberIds?: string[];
  visibility?: 'private' | 'shared' | 'public';
}

export interface RoutineWithSlots extends Routine {
  slots: TimeSlot[];
}

export interface CreateRoutineInput {
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  is_active?: boolean;
  slots: CreateTimeSlotInput[];
}

export interface UpdateRoutineInput {
  name?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  slots?: CreateTimeSlotInput[];
}

export interface RoutineStats {
  totalRoutines: number;
  totalTimeSlots: number;
  activeDays: number;
}

