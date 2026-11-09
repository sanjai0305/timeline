import { RoutineWithSlots, CreateRoutineInput, UpdateRoutineInput, RoutineStats } from '@/models/routine';

export interface IRoutineRepository {
  init(): Promise<void>;
  getAllRoutines(): Promise<RoutineWithSlots[]>;
  getRoutineById(id: string): Promise<RoutineWithSlots | null>;
  searchRoutines(query?: string, filter?: 'all' | 'active' | 'inactive'): Promise<RoutineWithSlots[]>;
  createRoutine(input: CreateRoutineInput): Promise<RoutineWithSlots>;
  updateRoutine(id: string, input: UpdateRoutineInput): Promise<RoutineWithSlots>;
  deleteRoutine(id: string): Promise<boolean>;
  toggleRoutineActive(id: string, isActive: boolean): Promise<boolean>;
  getStats(): Promise<RoutineStats>;
  getRoutinesForDate(dateStr: string): Promise<RoutineWithSlots[]>;
  clearAllData(): Promise<void>;
  importRoutines(routines: RoutineWithSlots[]): Promise<void>;
}

export interface DatabaseRoutineRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTimeSlotRow {
  id: string;
  routine_id: string;
  start_time: string;
  end_time: string;
  activity_name: string;
  category: string;
  icon: string;
  sort_order: number;
  reminder_enabled?: number;
  reminder_minutes_before?: number;
  created_at: string;
  updated_at: string;
}
