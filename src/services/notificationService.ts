import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { RoutineWithSlots } from '@/models/routine';
import { getDaysInRange, parseTimeToMinutes } from '@/utils/date';

export const NOTIFICATION_CHANNEL_ID = 'routine-reminders';

export interface ExactAlarmItem {
  alarmId: number;
  routineId: string;
  timeSlotId: string;
  activityName: string;
  startTime: string;
  endTime: string;
  triggerTimeMillis: number;
  dateStr: string;
}

export interface ExactAlarmPluginInterface {
  checkPermissions(): Promise<{ notifications: boolean; exactAlarm: boolean; canSchedule: boolean }>;
  requestExactAlarmPermission(): Promise<{ openedSettings: boolean; message?: string }>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  scheduleAlarm(options: ExactAlarmItem): Promise<{ success: boolean; alarmId: number }>;
  scheduleAlarmsBatch(options: { alarms: ExactAlarmItem[] }): Promise<{ scheduledCount: number }>;
  cancelAlarm(options: { alarmId: number }): Promise<{ cancelled: boolean }>;
  cancelRoutineAlarms(options: { routineId: string }): Promise<{ cancelledCount: number }>;
  cancelTimeSlotAlarms(options: { timeSlotId: string }): Promise<{ cancelledCount: number }>;
  testAlarm(): Promise<{ scheduled: boolean; triggerInSeconds: number }>;
  getUpcomingAlarms(): Promise<{ alarms: ExactAlarmItem[] }>;
}

export const NativeExactAlarm = registerPlugin<ExactAlarmPluginInterface>('ExactAlarm', {
  web: {
    checkPermissions: async () => ({ notifications: true, exactAlarm: true, canSchedule: true }),
    requestExactAlarmPermission: async () => ({ openedSettings: false }),
    requestNotificationPermission: async () => ({ granted: true }),
    scheduleAlarm: async () => ({ success: true, alarmId: 1 }),
    scheduleAlarmsBatch: async (opts: { alarms: ExactAlarmItem[] }) => ({ scheduledCount: opts.alarms.length }),
    cancelAlarm: async () => ({ cancelled: true }),
    cancelRoutineAlarms: async () => ({ cancelledCount: 0 }),
    cancelTimeSlotAlarms: async () => ({ cancelledCount: 0 }),
    testAlarm: async () => ({ scheduled: true, triggerInSeconds: 3 }),
    getUpcomingAlarms: async () => ({ alarms: [] }),
  },
});

/**
 * Deterministic 31-bit positive integer hash for notification and alarm IDs.
 * Fits within Android's 32-bit signed integer boundary (0 to 2,147,483,647).
 */
export function hashNotificationId(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 2147483647);
}

class NotificationService {
  private isChannelCreated = false;

  /**
   * Initialize notification channels and listeners.
   */
  async init(): Promise<void> {
    if (!Capacitor.isPluginAvailable('LocalNotifications')) {
      return;
    }

    try {
      if (Capacitor.getPlatform() === 'android' && !this.isChannelCreated) {
        await LocalNotifications.createChannel({
          id: NOTIFICATION_CHANNEL_ID,
          name: 'Routine Reminders',
          description: 'High-priority notifications and reminders for your scheduled daily routines and activities',
          importance: 5, // High importance
          visibility: 1, // Public on lockscreen
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#8B43EF',
        });
        this.isChannelCreated = true;
      }
    } catch (err) {
      console.warn('[NotificationService] Channel creation warning:', err);
    }
  }

  /**
   * Check Android and local notification permissions.
   */
  async checkPermissions(): Promise<{ notifications: boolean; exactAlarm: boolean; canSchedule: boolean }> {
    if (Capacitor.isNativePlatform()) {
      try {
        return await NativeExactAlarm.checkPermissions();
      } catch (e) {
        console.warn('Native exact alarm check error:', e);
      }
    }
    return { notifications: true, exactAlarm: true, canSchedule: true };
  }

  /**
   * Request standard notification permission.
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NativeExactAlarm.requestNotificationPermission();
        return res.granted;
      } catch (e) {
        console.warn('Native notification perm error:', e);
      }
    }
    return true;
  }

  /**
   * Request exact alarm settings page on Android 12+.
   */
  async requestExactAlarmPermission(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeExactAlarm.requestExactAlarmPermission();
      } catch (e) {
        console.warn('Native exact alarm open error:', e);
      }
    }
  }

  /**
   * Trigger an exact test alarm (fires audible notification in 3 seconds).
   */
  async triggerTestAlarm(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NativeExactAlarm.testAlarm();
        return res.scheduled;
      } catch (err) {
        console.error('Test alarm native error:', err);
      }
    }

    // Web fallback: schedule standard notification in 3 seconds
    try {
      if (Capacitor.isPluginAvailable('LocalNotifications')) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: 999999,
              title: '⏰ Test Routine Alarm',
              body: 'Your scheduled activity starts now.\nRoutine Planner',
              schedule: { at: new Date(Date.now() + 3000) },
              channelId: NOTIFICATION_CHANNEL_ID,
              sound: 'default',
            },
          ],
        });
        return true;
      }
    } catch (e) {
      console.warn('Web notification test error:', e);
    }
    return false;
  }

  /**
   * Get all currently scheduled upcoming alarms.
   */
  async getUpcomingAlarms(): Promise<ExactAlarmItem[]> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await NativeExactAlarm.getUpcomingAlarms();
        return res.alarms || [];
      } catch (err) {
        console.warn('Error fetching native upcoming alarms:', err);
      }
    }
    return [];
  }

  /**
   * Schedule all exact start-time alarms for a routine across its complete date range.
   * Cancels any previously scheduled alarms for this routine first.
   */
  async scheduleRoutineReminders(routine: RoutineWithSlots): Promise<number> {
    // 1. Cancel existing alarms for this routine
    await this.cancelRoutineReminders(routine.id);

    // If routine is inactive, do not schedule
    if (routine.is_active === 0) {
      return 0;
    }

    await this.init();

    const days = getDaysInRange(routine.start_date, routine.end_date);
    const nativeAlarmsToSchedule: ExactAlarmItem[] = [];
    const localNotifsToSchedule: LocalNotificationSchema[] = [];
    const now = Date.now();

    for (const dateStr of days) {
      for (let sIdx = 0; sIdx < routine.slots.length; sIdx++) {
        const slot = routine.slots[sIdx];
        if (slot.reminder_enabled === false) {
          continue;
        }

        const startMinutes = parseTimeToMinutes(slot.start_time);
        const hours = Math.floor(startMinutes / 60);
        const mins = startMinutes % 60;

        // Construct Date object for start time on this specific date using local calendar components
        const [year, month, day] = dateStr.split('-').map(Number);
        const slotStartDate = new Date(year, month - 1, day, hours, mins, 0, 0);
        const triggerTimeMillis = slotStartDate.getTime();

        // Exact start-time alarm: rings at the exact START TIME of the activity
        if (triggerTimeMillis > now) {
          const alarmId = hashNotificationId(`exact_${routine.id}_${slot.id || sIdx}_${dateStr}`);

          nativeAlarmsToSchedule.push({
            alarmId,
            routineId: routine.id,
            timeSlotId: slot.id || `slot_${sIdx}`,
            activityName: slot.activity_name,
            startTime: slot.start_time,
            endTime: slot.end_time,
            triggerTimeMillis,
            dateStr,
          });

          localNotifsToSchedule.push({
            id: alarmId,
            title: `⏰ ${slot.activity_name}`,
            body: `Your scheduled activity starts now.\n${slot.start_time} – ${slot.end_time}`,
            schedule: {
              at: slotStartDate,
              allowWhileIdle: true,
            },
            channelId: NOTIFICATION_CHANNEL_ID,
            sound: 'default',
            extra: {
              routineId: routine.id,
              slotId: slot.id,
              date: dateStr,
            },
          });
        }
      }
    }

    // Schedule on Native Android AlarmManager
    if (Capacitor.isNativePlatform() && nativeAlarmsToSchedule.length > 0) {
      try {
        const res = await NativeExactAlarm.scheduleAlarmsBatch({ alarms: nativeAlarmsToSchedule });
        console.log(`[NotificationService] Native exact alarms scheduled: ${res.scheduledCount}`);
      } catch (err) {
        console.error('[NotificationService] Error in native batch scheduling:', err);
      }
    }

    // Also schedule in Capacitor LocalNotifications as supplementary receiver
    if (Capacitor.isPluginAvailable('LocalNotifications') && localNotifsToSchedule.length > 0) {
      try {
        const BATCH_SIZE = 50;
        for (let i = 0; i < localNotifsToSchedule.length; i += BATCH_SIZE) {
          const batch = localNotifsToSchedule.slice(i, i + BATCH_SIZE);
          await LocalNotifications.schedule({ notifications: batch });
        }
      } catch (err) {
        console.warn('[NotificationService] LocalNotifications supplementary schedule error:', err);
      }
    }

    return nativeAlarmsToSchedule.length;
  }

  /**
   * Cancel all alarms for a specific routine.
   */
  async cancelRoutineReminders(routineId: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeExactAlarm.cancelRoutineAlarms({ routineId });
      } catch (err) {
        console.warn('[NotificationService] Native cancel routine alarms error:', err);
      }
    }

    if (Capacitor.isPluginAvailable('LocalNotifications')) {
      try {
        const pending = await LocalNotifications.getPending();
        const toCancel = pending.notifications.filter(
          (n) => n.extra && n.extra.routineId === routineId
        );

        if (toCancel.length > 0) {
          await LocalNotifications.cancel({
            notifications: toCancel.map((n) => ({ id: n.id })),
          });
        }
      } catch (err) {
        console.warn('[NotificationService] Error cancelling routine notifications:', err);
      }
    }
  }

  /**
   * Cancel alarms for a specific time slot when edited or removed.
   */
  async cancelTimeSlotReminders(timeSlotId: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeExactAlarm.cancelTimeSlotAlarms({ timeSlotId });
      } catch (err) {
        console.warn('[NotificationService] Native cancel slot alarms error:', err);
      }
    }
  }

  /**
   * Cancel all reminders across all routines.
   */
  async cancelAllReminders(): Promise<void> {
    if (Capacitor.isPluginAvailable('LocalNotifications')) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map((n) => ({ id: n.id })),
          });
        }
      } catch (err) {
        console.warn('[NotificationService] Error cancelling all notifications:', err);
      }
    }
  }
}

export const notificationService = new NotificationService();
