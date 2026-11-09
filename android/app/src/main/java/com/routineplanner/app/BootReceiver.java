package com.routineplanner.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import java.util.List;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.d(TAG, "Received system broadcast action: " + action);

        boolean isRescheduleEvent =
                Intent.ACTION_BOOT_COMPLETED.equals(action) ||
                Intent.ACTION_TIME_CHANGED.equals(action) ||
                "android.intent.action.TIME_SET".equals(action) ||
                Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
                Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                 AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED.equals(action));

        if (!isRescheduleEvent) return;

        AlarmStorage.cleanPastAlarms(context);
        List<AlarmStorage.AlarmItem> upcoming = AlarmStorage.getAllAlarms(context);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        long now = System.currentTimeMillis();
        int rescheduledCount = 0;

        for (AlarmStorage.AlarmItem item : upcoming) {
            // Skip already dismissed or past alarms
            if (item.triggerTimeMillis <= now || AlarmStorage.isOccurrenceDismissed(context, item.alarmId)) {
                continue;
            }

            Intent alarmIntent = new Intent(context, AlarmReceiver.class);
            alarmIntent.putExtra("alarmId", item.alarmId);
            alarmIntent.putExtra("routineId", item.routineId);
            alarmIntent.putExtra("routineName", item.routineName);
            alarmIntent.putExtra("timeSlotId", item.timeSlotId);
            alarmIntent.putExtra("activityName", item.activityName);
            alarmIntent.putExtra("startTime", item.startTime);
            alarmIntent.putExtra("endTime", item.endTime);
            alarmIntent.putExtra("eventType", item.eventType);
            alarmIntent.putExtra("dateStr", item.dateStr);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    item.alarmId,
                    alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(
                                AlarmManager.RTC_WAKEUP,
                                item.triggerTimeMillis,
                                pendingIntent
                        );
                        rescheduledCount++;
                    } else {
                        alarmManager.setAndAllowWhileIdle(
                                AlarmManager.RTC_WAKEUP,
                                item.triggerTimeMillis,
                                pendingIntent
                        );
                        rescheduledCount++;
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            item.triggerTimeMillis,
                            pendingIntent
                    );
                    rescheduledCount++;
                } else {
                    alarmManager.setExact(
                            AlarmManager.RTC_WAKEUP,
                            item.triggerTimeMillis,
                            pendingIntent
                    );
                    rescheduledCount++;
                }
            } catch (Exception e) {
                Log.e(TAG, "Error rescheduling alarm " + item.alarmId, e);
            }
        }

        Log.d(TAG, "Successfully restored " + rescheduledCount + " routine alarms.");
    }
}
