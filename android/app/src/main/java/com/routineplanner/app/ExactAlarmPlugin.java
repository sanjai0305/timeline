package com.routineplanner.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
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

import org.json.JSONArray;
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
        String timeSlotId = call.getString("timeSlotId", "");
        String activityName = call.getString("activityName", "Routine Activity");
        String startTime = call.getString("startTime", "");
        String endTime = call.getString("endTime", "");
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
        intent.putExtra("timeSlotId", timeSlotId);
        intent.putExtra("activityName", activityName);
        intent.putExtra("startTime", startTime);
        intent.putExtra("endTime", endTime);
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

            // Save to storage
            AlarmStorage.AlarmItem item = new AlarmStorage.AlarmItem();
            item.alarmId = alarmId;
            item.routineId = routineId;
            item.timeSlotId = timeSlotId;
            item.activityName = activityName;
            item.startTime = startTime;
            item.endTime = endTime;
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

                String routineId = obj.optString("routineId", "");
                String timeSlotId = obj.optString("timeSlotId", "");
                String activityName = obj.optString("activityName", "Routine Activity");
                String startTime = obj.optString("startTime", "");
                String endTime = obj.optString("endTime", "");
                String dateStr = obj.optString("dateStr", "");

                Intent intent = new Intent(getContext(), AlarmReceiver.class);
                intent.putExtra("alarmId", alarmId);
                intent.putExtra("routineId", routineId);
                intent.putExtra("timeSlotId", timeSlotId);
                intent.putExtra("activityName", activityName);
                intent.putExtra("startTime", startTime);
                intent.putExtra("endTime", endTime);
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
                item.timeSlotId = timeSlotId;
                item.activityName = activityName;
                item.startTime = startTime;
                item.endTime = endTime;
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
        intent.putExtra("timeSlotId", "test_slot");
        intent.putExtra("activityName", "Test Routine Alarm");
        intent.putExtra("startTime", "Now");
        intent.putExtra("endTime", "Next 1 hr");
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

