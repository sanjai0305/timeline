import { format, isValid, eachDayOfInterval } from 'date-fns';

/**
 * Parses YYYY-MM-DD without UTC timezone drift.
 */
export function parseLocalYMD(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

/**
 * Format a Date to YYYY-MM-DD local calendar string
 */
export function formatToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD to display string like "10 Nov 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = parseLocalYMD(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Format a start and end date range to "10 Nov 2026 – 20 Nov 2026"
 */
export function formatDateRange(startStr: string, endStr: string): string {
  if (!startStr && !endStr) return '';
  if (!endStr) return formatDisplayDate(startStr);
  if (!startStr) return formatDisplayDate(endStr);
  return `${formatDisplayDate(startStr)} – ${formatDisplayDate(endStr)}`;
}

/**
 * Checks if a target date (YYYY-MM-DD) falls within start and end date (inclusive)
 */
export function isDateInRange(targetDateStr: string, startStr: string, endStr: string): boolean {
  if (!targetDateStr || !startStr || !endStr) return false;
  return targetDateStr >= startStr && targetDateStr <= endStr;
}

/**
 * Returns array of YYYY-MM-DD strings for every day in interval inclusive
 */
export function getDaysInRange(startStr: string, endStr: string): string[] {
  try {
    const start = parseLocalYMD(startStr);
    const end = parseLocalYMD(endStr);
    if (!isValid(start) || !isValid(end) || start > end) return [];
    const intervalDays = eachDayOfInterval({ start, end });
    return intervalDays.map((d) => formatToYMD(d));
  } catch {
    return [];
  }
}

/**
 * Calculates number of unique calendar days covered by active routines
 */
export function calculateActiveDays(routines: { start_date: string; end_date: string; is_active: number | boolean }[]): number {
  const uniqueDays = new Set<string>();
  const activeRoutines = routines.filter((r) => (typeof r.is_active === 'number' ? r.is_active === 1 : !!r.is_active));

  for (const r of activeRoutines) {
    const days = getDaysInRange(r.start_date, r.end_date);
    for (const d of days) {
      uniqueDays.add(d);
    }
  }

  return uniqueDays.size;
}

/**
 * Parses time string ("05:00 AM", "01:30 PM", "14:30") to total minutes from midnight (0 - 1439)
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toUpperCase();

  // Check 12-hour AM/PM format (e.g. "05:00 AM", "5:00 PM")
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();

    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else {
      if (hours < 12) hours += 12;
    }
    return hours * 60 + minutes;
  }

  // Check 24-hour format (e.g. "14:30", "05:00")
  const h24Match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const minutes = parseInt(h24Match[2], 10);
    return hours * 60 + minutes;
  }

  return 0;
}

/**
 * Converts minutes from midnight to formatted time string (e.g. "05:00 AM" or "14:30")
 */
export function formatMinutesToTime(minutes: number, use24Hour: boolean = false): string {
  const normalized = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const padMins = String(mins).padStart(2, '0');

  if (use24Hour) {
    return `${String(hours24).padStart(2, '0')}:${padMins}`;
  }

  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  return `${String(hours12).padStart(2, '0')}:${padMins} ${period}`;
}

/**
 * Normalizes any time string to standard "hh:mm A" (e.g. "05:00 AM")
 */
export function normalizeTimeString(timeStr: string, use24Hour: boolean = false): string {
  const minutes = parseTimeToMinutes(timeStr);
  return formatMinutesToTime(minutes, use24Hour);
}

/**
 * Validates start and end time.
 * Returns error string if invalid, or null if valid.
 */
export function validateTimeRange(startTime: string, endTime: string): string | null {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (startMin >= endMin) {
    return 'End time must be later than start time';
  }
  return null;
}

export interface SlotTimeWindow {
  id?: string;
  start_time: string;
  end_time: string;
  activity_name?: string;
}

/**
 * Checks for overlapping slots in a list.
 * Returns error message identifying the overlap, or null if no overlap.
 */
export function findSlotOverlap(slots: SlotTimeWindow[], ignoreSlotId?: string): string | null {
  const filtered = slots.filter((s) => !ignoreSlotId || s.id !== ignoreSlotId);
  const sorted = [...filtered].sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const currentEnd = parseTimeToMinutes(current.end_time);
    const nextStart = parseTimeToMinutes(next.start_time);

    if (currentEnd > nextStart) {
      const currentName = current.activity_name ? `"${current.activity_name}"` : 'Time slot';
      const nextName = next.activity_name ? `"${next.activity_name}"` : 'Time slot';
      return `Overlapping time slots: ${currentName} (${current.start_time} - ${current.end_time}) overlaps with ${nextName} (${next.start_time} - ${next.end_time})`;
    }
  }

  return null;
}

/**
 * Sorts an array of slots by start time
 */
export function sortSlotsByStartTime<T extends { start_time: string }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
}
