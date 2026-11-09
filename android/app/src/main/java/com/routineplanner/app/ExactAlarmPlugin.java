package com.routineplanner.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "ExactAlarm",
    permissions = {
        @Permission(
            strings = { Manifest.permission.POST_NOTIFICATIONS },
            alias = "notifications"
        )
    }
)
public class ExactAlarmPlugin extends Plugin {

    private AlarmManager getAlarmManager() {
        return (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        boolean notifGranted = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        boolean exactAlarmGranted = true;

        AlarmManager am = getAlarmManager();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            exactAlarmGranted = am != null && am.canScheduleExactAlarms();
        }

        JSObject ret = new JSObject();
        ret.put("notifications", notifGranted);
        ret.put("exactAlarm", exactAlarmGranted);
        ret.put("canSchedule", notifGranted && exactAlarmGranted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);

                JSObject ret = new JSObject();
                ret.put("openedSettings", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Could not open exact alarm settings: " + e.getMessage(), e);
            }
        } else {
            JSObject ret = new JSObject();
            ret.put("openedSettings", false);
            ret.put("message", "Exact alarm permission not required below Android 12");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissionForAlias("notifications", call, "notificationPermCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
            call.resolve(ret);
        }
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void notificationPermCallback(PluginCall call) {
        boolean granted = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        Integer alarmId = call.getInt("alarmId");
        String routineId = call.getString("routineId", "");
        String routineName = call.getString("routineName", "My Routine");
        String timeSlotId = call.getString("timeSlotId", "");
        String activityName = call.getString("activityName", "Routine Activity");
        String startTime = call.getString("startTime", "");
        String endTime = call.getString("endTime", "");
        String eventType = call.getString("eventType", "START");
        Double triggerDouble = call.getDouble("triggerTimeMillis");
        String dateStr = call.getString("dateStr", "");

        if (alarmId == null || triggerDouble == null) {
            call.reject("alarmId and triggerTimeMillis are required");
            return;
        }

        long triggerTimeMillis = triggerDouble.longValue();
        if (triggerTimeMillis <= System.currentTimeMillis()) {
            call.reject("triggerTimeMillis must be in the future");
            return;
        }

        AlarmManager am = getAlarmManager();
        if (am == null) {
            call.reject("AlarmManager service not available");
            return;
        }

        Intent intent = new Intent(getContext(), AlarmReceiver.class);
        intent.putExtra("alarmId", alarmId);
        intent.putExtra("routineId", routineId);
        intent.putExtra("routineName", routineName);
        intent.putExtra("timeSlotId", timeSlotId);
        intent.putExtra("activityName", activityName);
        intent.putExtra("startTime", startTime);
        intent.putExtra("endTime", endTime);
        intent.putExtra("eventType", eventType);
        intent.putExtra("dateStr", dateStr);

        PendingIntent pi = PendingIntent.getBroadcast(
                getContext(),
                alarmId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMillis, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMillis, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTimeMillis, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerTimeMillis, pi);
            }

            // Persist to storage
            AlarmStorage.AlarmItem item = new AlarmStorage.AlarmItem();
            item.alarmId = alarmId;
            item.routineId = routineId;
            item.routineName = routineName;
            item.timeSlotId = timeSlotId;
            item.activityName = activityName;
            item.startTime = startTime;
            item.endTime = endTime;
            item.eventType = eventType;
            item.triggerTimeMillis = triggerTimeMillis;
            item.dateStr = dateStr;
            AlarmStorage.addOrUpdateAlarm(getContext(), item);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("alarmId", alarmId);
            call.resolve(ret);
        } catch (SecurityException se) {
            call.reject("SCHEDULE_EXACT_ALARM permission required: " + se.getMessage(), se);
        } catch (Exception e) {
            call.reject("Failed to schedule alarm: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void scheduleAlarmsBatch(PluginCall call) {
        JSArray arr = call.getArray("alarms");
        if (arr == null) {
            call.reject("alarms array is required");
            return;
        }

        AlarmManager am = getAlarmManager();
        if (am == null) {
            call.reject("AlarmManager service not available");
            return;
        }

        long now = System.currentTimeMillis();
        int scheduledCount = 0;
        List<AlarmStorage.AlarmItem> itemsToStore = new ArrayList<>();

        try {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                int alarmId = obj.getInt("alarmId");
                long trigger = obj.getLong("triggerTimeMillis");
                if (trigger <= now) continue;

                // Skip if already dismissed
                if (AlarmStorage.isOccurrenceDismissed(getContext(), alarmId)) continue;

                String routineId = obj.optString("routineId", "");
                String routineName = obj.optString("routineName", "My Routine");
                String timeSlotId = obj.optString("timeSlotId", "");
                String activityName = obj.optString("activityName", "Routine Activity");
                String startTime = obj.optString("startTime", "");
                String endTime = obj.optString("endTime", "");
                String eventType = obj.optString("eventType", "START");
                String dateStr = obj.optString("dateStr", "");

                Intent intent = new Intent(getContext(), AlarmReceiver.class);
                intent.putExtra("alarmId", alarmId);
                intent.putExtra("routineId", routineId);
                intent.putExtra("routineName", routineName);
                intent.putExtra("timeSlotId", timeSlotId);
                intent.putExtra("activityName", activityName);
                intent.putExtra("startTime", startTime);
                intent.putExtra("endTime", endTime);
                intent.putExtra("eventType", eventType);
                intent.putExtra("dateStr", dateStr);

                PendingIntent pi = PendingIntent.getBroadcast(
                        getContext(),
                        alarmId,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (am.canScheduleExactAlarms()) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
                    } else {
                        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, trigger, pi);
                }

                AlarmStorage.AlarmItem item = new AlarmStorage.AlarmItem();
                item.alarmId = alarmId;
                item.routineId = routineId;
                item.routineName = routineName;
                item.timeSlotId = timeSlotId;
                item.activityName = activityName;
                item.startTime = startTime;
                item.endTime = endTime;
                item.eventType = eventType;
                item.triggerTimeMillis = trigger;
                item.dateStr = dateStr;
                itemsToStore.add(item);

                scheduledCount++;
            }

            AlarmStorage.addAll(getContext(), itemsToStore);

            JSObject ret = new JSObject();
            ret.put("scheduledCount", scheduledCount);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Batch scheduling error: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        Integer alarmId = call.getInt("alarmId");
        if (alarmId == null) {
            call.reject("alarmId is required");
            return;
        }

        AlarmManager am = getAlarmManager();
        if (am != null) {
            Intent intent = new Intent(getContext(), AlarmReceiver.class);
            PendingIntent pi = PendingIntent.getBroadcast(
                    getContext(),
                    alarmId,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            am.cancel(pi);
        }

        AlarmStorage.removeAlarm(getContext(), alarmId);
        JSObject ret = new JSObject();
        ret.put("cancelled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelRoutineAlarms(PluginCall call) {
        String routineId = call.getString("routineId");
        if (routineId == null || routineId.isEmpty()) {
            call.reject("routineId is required");
            return;
        }

        AlarmManager am = getAlarmManager();
        List<AlarmStorage.AlarmItem> removed = AlarmStorage.removeAlarmsForRoutine(getContext(), routineId);

        if (am != null) {
            for (AlarmStorage.AlarmItem item : removed) {
                Intent intent = new Intent(getContext(), AlarmReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(
                        getContext(),
                        item.alarmId,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                am.cancel(pi);
            }
        }

        // Also stop active alarm if it belonged to this routine
        JSONObject active = AlarmStorage.getActiveSession(getContext());
        if (active != null) {
            stopActiveAlarm(call);
            return;
        }

        JSObject ret = new JSObject();
        ret.put("cancelledCount", removed.size());
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelTimeSlotAlarms(PluginCall call) {
        String timeSlotId = call.getString("timeSlotId");
        if (timeSlotId == null || timeSlotId.isEmpty()) {
            call.reject("timeSlotId is required");
            return;
        }

        AlarmManager am = getAlarmManager();
        List<AlarmStorage.AlarmItem> removed = AlarmStorage.removeAlarmsForTimeSlot(getContext(), timeSlotId);

        if (am != null) {
            for (AlarmStorage.AlarmItem item : removed) {
                Intent intent = new Intent(getContext(), AlarmReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(
                        getContext(),
                        item.alarmId,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                am.cancel(pi);
            }
        }

        JSObject ret = new JSObject();
        ret.put("cancelledCount", removed.size());
        call.resolve(ret);
    }

    /**
     * Immediately stops the active repeating foreground alarm (audio, vibration, timers)
     */
    @PluginMethod
    public void stopActiveAlarm(PluginCall call) {
        try {
            Intent stopIntent = new Intent(getContext(), AlarmService.class);
            stopIntent.setAction(AlarmService.ACTION_STOP);
            ContextCompat.startForegroundService(getContext(), stopIntent);

            JSObject ret = new JSObject();
            ret.put("stopped", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error stopping active alarm: " + e.getMessage(), e);
        }
    }

    /**
     * Checks if an alarm session is actively ringing/silent in the foreground
     */
    @PluginMethod
    public void getActiveAlarm(PluginCall call) {
        JSONObject session = AlarmStorage.getActiveSession(getContext());
        JSObject ret = new JSObject();
        if (session != null) {
            ret.put("isActive", true);
            ret.put("routineName", session.optString("routineName", ""));
            ret.put("activityName", session.optString("activityName", ""));
            ret.put("eventType", session.optString("eventType", "START"));
            ret.put("startTime", session.optString("startTime", ""));
            ret.put("endTime", session.optString("endTime", ""));
            ret.put("groupedDesc", session.optString("groupedDesc", ""));
        } else {
            ret.put("isActive", false);
        }
        call.resolve(ret);
    }

    /**
     * Updates alarm settings (start/end toggle, durations, vibration)
     */
    @PluginMethod
    public void updateAlarmSettings(PluginCall call) {
        AlarmStorage.AlarmSettings settings = AlarmStorage.getSettings(getContext());

        if (call.hasOption("startAlarmEnabled")) {
            settings.startAlarmEnabled = Boolean.TRUE.equals(call.getBoolean("startAlarmEnabled"));
        }
        if (call.hasOption("endAlarmEnabled")) {
            settings.endAlarmEnabled = Boolean.TRUE.equals(call.getBoolean("endAlarmEnabled"));
        }
        if (call.hasOption("ringDurationMinutes")) {
            settings.ringDurationMinutes = call.getInt("ringDurationMinutes", 3);
        }
        if (call.hasOption("silentIntervalMinutes")) {
            settings.silentIntervalMinutes = call.getInt("silentIntervalMinutes", 2);
        }
        if (call.hasOption("vibrationEnabled")) {
            settings.vibrationEnabled = Boolean.TRUE.equals(call.getBoolean("vibrationEnabled"));
        }
        if (call.hasOption("alarmSound")) {
            settings.alarmSound = call.getString("alarmSound", "default");
        }

        AlarmStorage.saveSettings(getContext(), settings);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("settings", settings.toJson());
        call.resolve(ret);
    }

    /**
     * Retrieves current alarm settings
     */
    @PluginMethod
    public void getAlarmSettings(PluginCall call) {
        AlarmStorage.AlarmSettings settings = AlarmStorage.getSettings(getContext());
        JSObject ret = new JSObject();
        ret.put("settings", settings.toJson());
        call.resolve(ret);
    }

    /**
     * Triggers a test repeating alarm in 3 seconds to verify ringing, vibration, notification, and STOP action
     */
    @PluginMethod
    public void testAlarm(PluginCall call) {
        AlarmManager am = getAlarmManager();
        if (am == null) {
            call.reject("AlarmManager not available");
            return;
        }

        int testAlarmId = 999999;
        long trigger = System.currentTimeMillis() + 3000; // 3 seconds in future

        Intent intent = new Intent(getContext(), AlarmReceiver.class);
        intent.putExtra("alarmId", testAlarmId);
        intent.putExtra("routineId", "test_routine");
        intent.putExtra("routineName", "Test Daily Routine");
        intent.putExtra("timeSlotId", "test_slot");
        intent.putExtra("activityName", "Morning Study (Test)");
        intent.putExtra("startTime", "05:00 AM");
        intent.putExtra("endTime", "06:00 AM");
        intent.putExtra("eventType", "START");
        intent.putExtra("dateStr", "Today");

        PendingIntent pi = PendingIntent.getBroadcast(
                getContext(),
                testAlarmId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, trigger, pi);
            }

            JSObject ret = new JSObject();
            ret.put("scheduled", true);
            ret.put("triggerInSeconds", 3);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to schedule test alarm: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void getUpcomingAlarms(PluginCall call) {
        AlarmStorage.cleanPastAlarms(getContext());
        List<AlarmStorage.AlarmItem> list = AlarmStorage.getAllAlarms(getContext());

        JSArray arr = new JSArray();
        for (AlarmStorage.AlarmItem item : list) {
            JSONObject obj = item.toJson();
            if (obj != null) {
                arr.put(obj);
            }
        }

        JSObject ret = new JSObject();
        ret.put("alarms", arr);
        call.resolve(ret);
    }
}
