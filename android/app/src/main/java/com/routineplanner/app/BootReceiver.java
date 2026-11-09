package com.routineplanner.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.List;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_TIME_CHANGED.equals(action) ||
            Intent.ACTION_TIMEZONE_CHANGED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {

            AlarmStorage.cleanPastAlarms(context);
            List<AlarmStorage.AlarmItem> upcoming = AlarmStorage.getAllAlarms(context);

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            long now = System.currentTimeMillis();

            for (AlarmStorage.AlarmItem item : upcoming) {
                if (item.triggerTimeMillis > now) {
                    Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                    alarmIntent.putExtra("alarmId", item.alarmId);
                    alarmIntent.putExtra("routineId", item.routineId);
                    alarmIntent.putExtra("timeSlotId", item.timeSlotId);
                    alarmIntent.putExtra("activityName", item.activityName);
                    alarmIntent.putExtra("startTime", item.startTime);
                    alarmIntent.putExtra("endTime", item.endTime);
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
                            } else {
                                alarmManager.setAndAllowWhileIdle(
                                        AlarmManager.RTC_WAKEUP,
                                        item.triggerTimeMillis,
                                        pendingIntent
                                );
                            }
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(
                                    AlarmManager.RTC_WAKEUP,
                                    item.triggerTimeMillis,
                                    pendingIntent
                            );
                        } else {
                            alarmManager.setExact(
                                    AlarmManager.RTC_WAKEUP,
                                    item.triggerTimeMillis,
                                    pendingIntent
                            );
                        }
                    } catch (Exception ignored) {}
                }
            }
        }
    }
}

