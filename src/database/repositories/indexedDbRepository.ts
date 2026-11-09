import { openDB, IDBPDatabase } from 'idb';
import { IRoutineRepository, DatabaseRoutineRow, DatabaseTimeSlotRow } from './types';
import { RoutineWithSlots, CreateRoutineInput, UpdateRoutineInput, RoutineStats } from '@/models/routine';
import { TimeSlot } from '@/models/time-slot';
import { calculateActiveDays, sortSlotsByStartTime, isDateInRange } from '@/utils/date';
import { CategoryId } from '@/models/category';

const DB_NAME = 'routine_planner_browser_db';
const DB_VERSION = 1;

export class IndexedDbRoutineRepository implements IRoutineRepository {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('routines')) {
          const routineStore = db.createObjectStore('routines', { keyPath: 'id' });
          routineStore.createIndex('by_start_date', 'start_date');
          routineStore.createIndex('by_active', 'is_active');
        }

        if (!db.objectStoreNames.contains('time_slots')) {
          const slotStore = db.createObjectStore('time_slots', { keyPath: 'id' });
          slotStore.createIndex('by_routine_id', 'routine_id');
          slotStore.createIndex('by_routine_order', ['routine_id', 'sort_order']);
        }
      },
    });
  }

  private ensureDb(): IDBPDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async getAllRoutines(): Promise<RoutineWithSlots[]> {
    const db = this.ensureDb();
    const rawRoutines: DatabaseRoutineRow[] = await db.getAll('routines');
    const allSlots: DatabaseTimeSlotRow[] = await db.getAll('time_slots');

    // Group slots by routine_id
    const slotsMap = new Map<string, TimeSlot[]>();
    for (const slot of allSlots) {
      const list = slotsMap.get(slot.routine_id) || [];
      list.push({
        ...slot,
        category: slot.category as CategoryId,
        reminder_enabled: slot.reminder_enabled !== 0,
        reminder_minutes_before: (slot.reminder_minutes_before ?? 10) as any,
      });
      slotsMap.set(slot.routine_id, list);
    }

    // Sort routines newest created first
    return rawRoutines
      .map((r) => ({
        ...r,
        slots: sortSlotsByStartTime(slotsMap.get(r.id) || []),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getRoutineById(id: string): Promise<RoutineWithSlots | null> {
    const db = this.ensureDb();
    const routine: DatabaseRoutineRow | undefined = await db.get('routines', id);
    if (!routine) return null;

    const allSlots: DatabaseTimeSlotRow[] = await db.getAllFromIndex('time_slots', 'by_routine_id', id);
    const slots: TimeSlot[] = allSlots.map((s) => ({
      ...s,
      category: s.category as CategoryId,
      reminder_enabled: s.reminder_enabled !== 0,
      reminder_minutes_before: (s.reminder_minutes_before ?? 10) as any,
    }));

    return {
      ...routine,
      slots: sortSlotsByStartTime(slots),
    };
  }

  async searchRoutines(query?: string, filter: 'all' | 'active' | 'inactive' = 'all'): Promise<RoutineWithSlots[]> {
    const all = await this.getAllRoutines();
    return all.filter((r) => {
      const matchesQuery = !query || r.name.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'active'
          ? r.is_active === 1
          : r.is_active === 0;

      return matchesQuery && matchesFilter;
    });
  }

  async createRoutine(input: CreateRoutineInput): Promise<RoutineWithSlots> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    const routineId = crypto.randomUUID ? crypto.randomUUID() : `rot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const routineRow: DatabaseRoutineRow = {
      id: routineId,
      name: input.name.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      is_active: input.is_active === false ? 0 : 1,
      created_at: now,
      updated_at: now,
    };

    const sortedSlots = sortSlotsByStartTime(input.slots);
    const slotRows: DatabaseTimeSlotRow[] = sortedSlots.map((slot, index) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `slot_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
      routine_id: routineId,
      start_time: slot.start_time,
      end_time: slot.end_time,
      activity_name: slot.activity_name.trim(),
      category: slot.category,
      icon: slot.icon,
      sort_order: index,
      reminder_enabled: slot.reminder_enabled !== false ? 1 : 0,
      reminder_minutes_before: typeof slot.reminder_minutes_before === 'number' ? slot.reminder_minutes_before : 10,
      created_at: now,
      updated_at: now,
    }));

    const tx = db.transaction(['routines', 'time_slots'], 'readwrite');
    await tx.objectStore('routines').add(routineRow);
    const slotStore = tx.objectStore('time_slots');
    for (const slotRow of slotRows) {
      await slotStore.add(slotRow);
    }
    await tx.done;

    return {
      ...routineRow,
      slots: slotRows.map((s) => ({
        ...s,
        category: s.category as CategoryId,
        reminder_enabled: s.reminder_enabled !== 0,
        reminder_minutes_before: (s.reminder_minutes_before ?? 10) as any,
      })),
    };
  }

  async updateRoutine(id: string, input: UpdateRoutineInput): Promise<RoutineWithSlots> {
    const db = this.ensureDb();
    const existing = await this.getRoutineById(id);
    if (!existing) {
      throw new Error(`Routine with id ${id} not found`);
    }

    const now = new Date().toISOString();
    const updatedRoutineRow: DatabaseRoutineRow = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      start_date: input.start_date !== undefined ? input.start_date : existing.start_date,
      end_date: input.end_date !== undefined ? input.end_date : existing.end_date,
      is_active: input.is_active !== undefined ? (input.is_active ? 1 : 0) : existing.is_active,
      updated_at: now,
    };

    const tx = db.transaction(['routines', 'time_slots'], 'readwrite');
    await tx.objectStore('routines').put(updatedRoutineRow);

    let slots: TimeSlot[] = existing.slots;

    if (input.slots !== undefined) {
      // Remove old slots for this routine
      const slotStore = tx.objectStore('time_slots');
      const existingSlots = await slotStore.index('by_routine_id').getAllKeys(id);
      for (const slotKey of existingSlots) {
        await slotStore.delete(slotKey);
      }

      // Add new slots
      const sortedSlots = sortSlotsByStartTime(input.slots);
      const newSlotRows: DatabaseTimeSlotRow[] = sortedSlots.map((slot, index) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `slot_${Date.now()}_${index}`,
        routine_id: id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        activity_name: slot.activity_name.trim(),
        category: slot.category,
        icon: slot.icon,
        sort_order: index,
        reminder_enabled: slot.reminder_enabled !== false ? 1 : 0,
        reminder_minutes_before: typeof slot.reminder_minutes_before === 'number' ? slot.reminder_minutes_before : 10,
        created_at: now,
        updated_at: now,
      }));

      for (const slotRow of newSlotRows) {
        await slotStore.add(slotRow);
      }

      slots = newSlotRows.map((s) => ({
        ...s,
        category: s.category as CategoryId,
        reminder_enabled: s.reminder_enabled !== 0,
        reminder_minutes_before: (s.reminder_minutes_before ?? 10) as any,
      }));
    }

    await tx.done;

    return {
      ...updatedRoutineRow,
      slots,
    };
  }

  async deleteRoutine(id: string): Promise<boolean> {
    const db = this.ensureDb();
    const tx = db.transaction(['routines', 'time_slots'], 'readwrite');
    
    // Delete routine
    await tx.objectStore('routines').delete(id);

    // Delete cascading slots
    const slotStore = tx.objectStore('time_slots');
    const slotKeys = await slotStore.index('by_routine_id').getAllKeys(id);
    for (const key of slotKeys) {
      await slotStore.delete(key);
    }

    await tx.done;
    return true;
  }

  async toggleRoutineActive(id: string, isActive: boolean): Promise<boolean> {
    const db = this.ensureDb();
    const routine: DatabaseRoutineRow | undefined = await db.get('routines', id);
    if (!routine) return false;

    routine.is_active = isActive ? 1 : 0;
    routine.updated_at = new Date().toISOString();
    await db.put('routines', routine);
    return true;
  }

  async getStats(): Promise<RoutineStats> {
    const all = await this.getAllRoutines();
    const totalRoutines = all.length;
    let totalTimeSlots = 0;
    for (const r of all) {
      totalTimeSlots += r.slots.length;
    }
    const activeDays = calculateActiveDays(all);

    return {
      totalRoutines,
      totalTimeSlots,
      activeDays,
    };
  }

  async getRoutinesForDate(dateStr: string): Promise<RoutineWithSlots[]> {
    const all = await this.getAllRoutines();
    return all.filter((r) => r.is_active === 1 && isDateInRange(dateStr, r.start_date, r.end_date));
  }

  async clearAllData(): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(['routines', 'time_slots'], 'readwrite');
    await tx.objectStore('routines').clear();
    await tx.objectStore('time_slots').clear();
    await tx.done;
  }

  async importRoutines(routines: RoutineWithSlots[]): Promise<void> {
    const db = this.ensureDb();
    const tx = db.transaction(['routines', 'time_slots'], 'readwrite');
    const rStore = tx.objectStore('routines');
    const sStore = tx.objectStore('time_slots');

    for (const r of routines) {
      const { slots, ...rData } = r;
      await rStore.put(rData);
      for (const slot of slots) {
        await sStore.put(slot);
      }
    }
    await tx.done;
  }
}

