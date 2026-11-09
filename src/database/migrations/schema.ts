export const DATABASE_NAME = 'routine_planner_db';
export const DATABASE_VERSION = 1;

export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_slots (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  reminder_enabled INTEGER NOT NULL DEFAULT 1,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_routines_dates ON routines (start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_routines_active ON routines (is_active);
CREATE INDEX IF NOT EXISTS idx_time_slots_routine ON time_slots (routine_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_order ON time_slots (routine_id, sort_order);
`;

