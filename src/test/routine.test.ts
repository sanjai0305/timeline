import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  isDateInRange,
  getDaysInRange,
  calculateActiveDays,
  findSlotOverlap,
  sortSlotsByStartTime,
} from '@/utils/date';
import { IndexedDbRoutineRepository } from '@/database/repositories/indexedDbRepository';
import { hashNotificationId } from '@/services/notificationService';
import { backButtonService } from '@/services/backButtonService';

describe('Android Back Button Navigation Service', () => {
  it('correctly registers and dismisses modal callbacks in LIFO order', () => {
    let modal1Closed = false;
    let modal2Closed = false;

    const unreg1 = backButtonService.registerModal(() => {
      modal1Closed = true;
      return true;
    });

    const unreg2 = backButtonService.registerModal(() => {
      modal2Closed = true;
      return true;
    });

    // Unregistering modal 2 should not affect modal 1
    unreg2();
    expect(modal2Closed).toBe(false);

    // Trigger registered modal 1
    unreg1();
    expect(modal1Closed).toBe(false);
  });
});

describe('Local Notification Alarms', () => {
  it('generates deterministic 31-bit positive notification IDs', () => {
    const id1 = hashNotificationId('adv_routine123_slot0_2026-11-10');
    const id2 = hashNotificationId('adv_routine123_slot0_2026-11-10');
    const id3 = hashNotificationId('adv_routine123_slot0_2026-11-11');

    expect(id1).toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).toBeGreaterThanOrEqual(0);
    expect(id1).toBeLessThanOrEqual(2147483647);
  });
});

describe('Routine Time & Date Utilities', () => {
  it('correctly parses 12-hour AM/PM times to minutes from midnight', () => {
    expect(parseTimeToMinutes('12:00 AM')).toBe(0);
    expect(parseTimeToMinutes('05:00 AM')).toBe(300);
    expect(parseTimeToMinutes('07:45 AM')).toBe(465);
    expect(parseTimeToMinutes('12:00 PM')).toBe(720);
    expect(parseTimeToMinutes('01:00 PM')).toBe(780);
    expect(parseTimeToMinutes('11:59 PM')).toBe(1439);
  });

  it('correctly converts minutes back to 12-hour and 24-hour formats', () => {
    expect(formatMinutesToTime(300, false)).toBe('05:00 AM');
    expect(formatMinutesToTime(780, false)).toBe('01:00 PM');
    expect(formatMinutesToTime(300, true)).toBe('05:00');
    expect(formatMinutesToTime(780, true)).toBe('13:00');
  });

  it('handles inclusive date ranges correctly without timezone off-by-one errors', () => {
    const start = '2026-11-10';
    const end = '2026-11-20';

    expect(isDateInRange('2026-11-09', start, end)).toBe(false);
    expect(isDateInRange('2026-11-10', start, end)).toBe(true);
    expect(isDateInRange('2026-11-15', start, end)).toBe(true);
    expect(isDateInRange('2026-11-20', start, end)).toBe(true);
    expect(isDateInRange('2026-11-21', start, end)).toBe(false);

    const days = getDaysInRange(start, end);
    expect(days.length).toBe(11);
    expect(days[0]).toBe('2026-11-10');
    expect(days[days.length - 1]).toBe('2026-11-20');
  });

  it('calculates unique active days across multiple active routines', () => {
    const routines = [
      { start_date: '2026-11-10', end_date: '2026-11-20', is_active: 1 }, // 11 days
      { start_date: '2026-11-15', end_date: '2026-11-25', is_active: 1 }, // overlap 15-20, adds 21-25 (5 days)
      { start_date: '2026-12-01', end_date: '2026-12-05', is_active: 0 }, // inactive, should not count
    ];

    const activeDays = calculateActiveDays(routines);
    expect(activeDays).toBe(16); // 11 + 5
  });

  it('validates and detects slot overlaps', () => {
    // Non-overlapping slots (consecutive end and start time are allowed)
    const validSlots = [
      { start_time: '05:00 AM', end_time: '06:00 AM', activity_name: 'Study' },
      { start_time: '06:00 AM', end_time: '07:00 AM', activity_name: 'Gym' },
    ];
    expect(findSlotOverlap(validSlots)).toBeNull();

    // Overlapping slots
    const overlappingSlots = [
      { start_time: '05:00 AM', end_time: '06:30 AM', activity_name: 'Study' },
      { start_time: '06:00 AM', end_time: '07:00 AM', activity_name: 'Gym' },
    ];
    expect(findSlotOverlap(overlappingSlots)).not.toBeNull();
  });

  it('sorts slots in ascending chronological order', () => {
    const unsorted = [
      { start_time: '12:00 PM', end_time: '01:00 PM', activity_name: 'Lunch' },
      { start_time: '05:00 AM', end_time: '06:00 AM', activity_name: 'Study' },
      { start_time: '07:00 AM', end_time: '07:45 AM', activity_name: 'Breakfast' },
    ];

    const sorted = sortSlotsByStartTime(unsorted);
    expect(sorted[0].activity_name).toBe('Study');
    expect(sorted[1].activity_name).toBe('Breakfast');
    expect(sorted[2].activity_name).toBe('Lunch');
  });
});

describe('IndexedDbRoutineRepository CRUD & Logic', () => {
  let repo: IndexedDbRoutineRepository;

  beforeEach(async () => {
    repo = new IndexedDbRoutineRepository();
    await repo.init();
    await repo.clearAllData();
  });

  it('creates routine, persists slots, and retrieves correctly', async () => {
    const created = await repo.createRoutine({
      name: 'My Study Routine',
      start_date: '2026-11-10',
      end_date: '2026-11-20',
      is_active: true,
      slots: [
        {
          start_time: '05:00 AM',
          end_time: '06:00 AM',
          activity_name: 'Morning Study',
          category: 'study',
          icon: 'BookOpen',
          sort_order: 0,
        },
        {
          start_time: '06:00 AM',
          end_time: '07:00 AM',
          activity_name: 'Exercise',
          category: 'exercise',
          icon: 'Dumbbell',
          sort_order: 1,
        },
      ],
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('My Study Routine');
    expect(created.slots.length).toBe(2);

    const stats = await repo.getStats();
    expect(stats.totalRoutines).toBe(1);
    expect(stats.totalTimeSlots).toBe(2);
    expect(stats.activeDays).toBe(11);

    // Test get for date
    const dateRoutines = await repo.getRoutinesForDate('2026-11-15');
    expect(dateRoutines.length).toBe(1);
    expect(dateRoutines[0].slots[0].activity_name).toBe('Morning Study');

    const outsideDateRoutines = await repo.getRoutinesForDate('2026-11-25');
    expect(outsideDateRoutines.length).toBe(0);
  });
});

