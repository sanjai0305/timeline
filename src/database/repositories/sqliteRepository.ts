import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { IRoutineRepository, DatabaseRoutineRow, DatabaseTimeSlotRow } from './types';
import { RoutineWithSlots, CreateRoutineInput, UpdateRoutineInput, RoutineStats } from '@/models/routine';
import { TimeSlot } from '@/models/time-slot';
import { DATABASE_NAME, DATABASE_VERSION, INIT_SQL } from '../migrations/schema';
import { calculateActiveDays, sortSlotsByStartTime, isDateInRange } from '@/utils/date';
import { CategoryId } from '@/models/category';

export class SqliteRoutineRepository implements IRoutineRepository {
  private sqlite: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    this.sqlite = new SQLiteConnection(CapacitorSQLite);

    // Create or retrieve existing database connection
    const isConn = (await this.sqlite.isConnection(DATABASE_NAME, false)).result;
    if (isConn) {
      this.db = await this.sqlite.retrieveConnection(DATABASE_NAME, false);
    } else {
      this.db = await this.sqlite.createConnection(
        DATABASE_NAME,
        false,
        'no-encryption',
        DATABASE_VERSION,
        false
      );
    }

    await this.db.open();

    // Enable foreign keys
    await this.db.execute('PRAGMA foreign_keys = ON;');

    // Run schema migrations
    await this.db.execute(INIT_SQL);

    try {
      await this.db.execute('ALTER TABLE time_slots ADD COLUMN reminder_enabled INTEGER DEFAULT 1;');
    } catch (_) {}
    try {
      await this.db.execute('ALTER TABLE time_slots ADD COLUMN reminder_minutes_before INTEGER DEFAULT 10;');
    } catch (_) {}

    this.isInitialized = true;
  }

  private ensureDb(): SQLiteDBConnection {
    if (!this.db) {
      throw new Error('SQLite Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async getAllRoutines(): Promise<RoutineWithSlots[]> {
    const db = this.ensureDb();
    const resRoutines = await db.query('SELECT * FROM routines ORDER BY created_at DESC;');
    const rawRoutines = (resRoutines.values || []) as DatabaseRoutineRow[];

    if (rawRoutines.length === 0) {
      return [];
    }

    const resSlots = await db.query('SELECT * FROM time_slots ORDER BY sort_order ASC;');
    const rawSlots = (resSlots.values || []) as DatabaseTimeSlotRow[];

    const slotsMap = new Map<string, TimeSlot[]>();
    for (const slot of rawSlots) {
      const list = slotsMap.get(slot.routine_id) || [];
      list.push({
        ...slot,
        category: slot.category as CategoryId,
        reminder_enabled: slot.reminder_enabled !== 0,
        reminder_minutes_before: (slot.reminder_minutes_before ?? 10) as any,
      });
      slotsMap.set(slot.routine_id, list);
    }

    return rawRoutines.map((r) => ({
      ...r,
      slots: sortSlotsByStartTime(slotsMap.get(r.id) || []),
    }));
  }

  async getRoutineById(id: string): Promise<RoutineWithSlots | null> {
    const db = this.ensureDb();
    const res = await db.query('SELECT * FROM routines WHERE id = ?;', [id]);
    const routines = (res.values || []) as DatabaseRoutineRow[];
    if (routines.length === 0) return null;

    const routine = routines[0];
    const resSlots = await db.query('SELECT * FROM time_slots WHERE routine_id = ? ORDER BY sort_order ASC;', [id]);
    const slots = ((resSlots.values || []) as DatabaseTimeSlotRow[]).map((s) => ({
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
      id: crypto.randomUUID ? crypto.randomUUID() : `slot_${Date.now()}_${index}`,
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

    // Insert routine
    await db.run(
      'INSERT INTO routines (id, name, start_date, end_date, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [
        routineRow.id,
        routineRow.name,
        routineRow.start_date,
        routineRow.end_date,
        routineRow.is_active,
        routineRow.created_at,
        routineRow.updated_at,
      ]
    );

    // Insert time slots
    for (const slot of slotRows) {
      await db.run(
        'INSERT INTO time_slots (id, routine_id, start_time, end_time, activity_name, category, icon, sort_order, reminder_enabled, reminder_minutes_before, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
        [
          slot.id,
          slot.routine_id,
          slot.start_time,
          slot.end_time,
          slot.activity_name,
          slot.category,
          slot.icon,
          slot.sort_order,
          slot.reminder_enabled ?? 1,
          slot.reminder_minutes_before ?? 10,
          slot.created_at,
          slot.updated_at,
        ]
      );
    }

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
    const updatedName = input.name !== undefined ? input.name.trim() : existing.name;
    const updatedStart = input.start_date !== undefined ? input.start_date : existing.start_date;
    const updatedEnd = input.end_date !== undefined ? input.end_date : existing.end_date;
    const updatedActive = input.is_active !== undefined ? (input.is_active ? 1 : 0) : existing.is_active;

    await db.run(
      'UPDATE routines SET name = ?, start_date = ?, end_date = ?, is_active = ?, updated_at = ? WHERE id = ?;',
      [updatedName, updatedStart, updatedEnd, updatedActive, now, id]
    );

    let slots = existing.slots;

    if (input.slots !== undefined) {
      // Delete old slots
      await db.run('DELETE FROM time_slots WHERE routine_id = ?;', [id]);

      // Insert new slots
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

      for (const slot of newSlotRows) {
        await db.run(
          'INSERT INTO time_slots (id, routine_id, start_time, end_time, activity_name, category, icon, sort_order, reminder_enabled, reminder_minutes_before, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            slot.id,
            slot.routine_id,
            slot.start_time,
            slot.end_time,
            slot.activity_name,
            slot.category,
            slot.icon,
            slot.sort_order,
            slot.reminder_enabled ?? 1,
            slot.reminder_minutes_before ?? 10,
            slot.created_at,
            slot.updated_at,
          ]
        );
      }

      slots = newSlotRows.map((s) => ({
        ...s,
        category: s.category as CategoryId,
        reminder_enabled: s.reminder_enabled !== 0,
        reminder_minutes_before: (s.reminder_minutes_before ?? 10) as any,
      }));
    }

    return {
      id,
      name: updatedName,
      start_date: updatedStart,
      end_date: updatedEnd,
      is_active: updatedActive,
      created_at: existing.created_at,
      updated_at: now,
      slots,
    };
  }

  async deleteRoutine(id: string): Promise<boolean> {
    const db = this.ensureDb();
    // Foreign key with CASCADE will remove time_slots, but we also run explicit delete for safety
    await db.run('DELETE FROM time_slots WHERE routine_id = ?;', [id]);
    await db.run('DELETE FROM routines WHERE id = ?;', [id]);
    return true;
  }

  async toggleRoutineActive(id: string, isActive: boolean): Promise<boolean> {
    const db = this.ensureDb();
    const now = new Date().toISOString();
    await db.run('UPDATE routines SET is_active = ?, updated_at = ? WHERE id = ?;', [
      isActive ? 1 : 0,
      now,
      id,
    ]);
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
    await db.run('DELETE FROM time_slots;');
    await db.run('DELETE FROM routines;');
  }

  async importRoutines(routines: RoutineWithSlots[]): Promise<void> {
    for (const r of routines) {
      await this.createRoutine({
        name: r.name,
        start_date: r.start_date,
        end_date: r.end_date,
        is_active: r.is_active === 1,
        slots: r.slots.map((s) => ({
          start_time: s.start_time,
          end_time: s.end_time,
          activity_name: s.activity_name,
          category: s.category,
          icon: s.icon,
          sort_order: s.sort_order,
        })),
      });
    }
  }
}
