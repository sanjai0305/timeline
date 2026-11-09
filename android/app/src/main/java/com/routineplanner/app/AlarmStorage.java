package com.timeline;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class AlarmStorage {
    private static final String PREF_NAME = "routine_planner_alarms";
    private static final String KEY_ALARMS = "active_alarms";
    private static final String KEY_DISMISSED = "dismissed_alarms";
    private static final String KEY_ACTIVE_SESSION = "active_alarm_session";

    // Settings Keys
    private static final String PREF_SETTINGS = "routine_alarm_settings";
    private static final String KEY_START_ALARM = "start_alarm_enabled";
    private static final String KEY_END_ALARM = "end_alarm_enabled";
    private static final String KEY_RING_DURATION = "ring_duration_mins";
    private static final String KEY_SILENT_INTERVAL = "silent_interval_mins";
    private static final String KEY_VIBRATION = "vibration_enabled";
    private static final String KEY_ALARM_SOUND = "alarm_sound";

    public static class AlarmItem {
        public int alarmId;
        public String routineId;
        public String routineName;
        public String timeSlotId;
        public String activityName;
        public String startTime;
        public String endTime;
        public String eventType; // "START" or "END"
        public long triggerTimeMillis;
        public String dateStr;

        public AlarmItem() {
            this.routineName = "";
            this.eventType = "START";
        }

        public JSONObject toJson() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("alarmId", alarmId);
                obj.put("routineId", routineId);
                obj.put("routineName", routineName);
                obj.put("timeSlotId", timeSlotId);
                obj.put("activityName", activityName);
                obj.put("startTime", startTime);
                obj.put("endTime", endTime);
                obj.put("eventType", eventType);
                obj.put("triggerTimeMillis", triggerTimeMillis);
                obj.put("dateStr", dateStr);
                return obj;
            } catch (Exception e) {
                return null;
            }
        }

        public static AlarmItem fromJson(JSONObject obj) {
            try {
                AlarmItem item = new AlarmItem();
                item.alarmId = obj.getInt("alarmId");
                item.routineId = obj.optString("routineId", "");
                item.routineName = obj.optString("routineName", "");
                item.timeSlotId = obj.optString("timeSlotId", "");
                item.activityName = obj.optString("activityName", "Routine Activity");
                item.startTime = obj.optString("startTime", "");
                item.endTime = obj.optString("endTime", "");
                item.eventType = obj.optString("eventType", "START");
                item.triggerTimeMillis = obj.getLong("triggerTimeMillis");
                item.dateStr = obj.optString("dateStr", "");
                return item;
            } catch (Exception e) {
                return null;
            }
        }
    }

    public static class AlarmSettings {
        public boolean startAlarmEnabled = true;
        public boolean endAlarmEnabled = true;
        public int ringDurationMinutes = 3;
        public int silentIntervalMinutes = 2;
        public boolean vibrationEnabled = true;
        public String alarmSound = "default";

        public JSONObject toJson() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("startAlarmEnabled", startAlarmEnabled);
                obj.put("endAlarmEnabled", endAlarmEnabled);
                obj.put("ringDurationMinutes", ringDurationMinutes);
                obj.put("silentIntervalMinutes", silentIntervalMinutes);
                obj.put("vibrationEnabled", vibrationEnabled);
                obj.put("alarmSound", alarmSound);
                return obj;
            } catch (Exception e) {
                return new JSONObject();
            }
        }
    }

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    private static SharedPreferences getSettingsPrefs(Context context) {
        return context.getSharedPreferences(PREF_SETTINGS, Context.MODE_PRIVATE);
    }

    // ================= ALARM ITEMS STORAGE =================

    public static synchronized List<AlarmItem> getAllAlarms(Context context) {
        List<AlarmItem> list = new ArrayList<>();
        String raw = getPrefs(context).getString(KEY_ALARMS, "[]");
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                AlarmItem item = AlarmItem.fromJson(arr.getJSONObject(i));
                if (item != null) {
                    list.add(item);
                }
            }
        } catch (Exception ignored) {
        }
        return list;
    }

    public static synchronized void saveAllAlarms(Context context, List<AlarmItem> alarms) {
        JSONArray arr = new JSONArray();
        for (AlarmItem item : alarms) {
            JSONObject obj = item.toJson();
            if (obj != null) {
                arr.put(obj);
            }
        }
        getPrefs(context).edit().putString(KEY_ALARMS, arr.toString()).apply();
    }

    public static synchronized void addOrUpdateAlarm(Context context, AlarmItem item) {
        List<AlarmItem> list = getAllAlarms(context);
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i).alarmId == item.alarmId) {
                list.remove(i);
                break;
            }
        }
        list.add(item);
        saveAllAlarms(context, list);
    }

    public static synchronized void addAll(Context context, List<AlarmItem> newItems) {
        List<AlarmItem> list = getAllAlarms(context);
        for (AlarmItem newItem : newItems) {
            for (int i = 0; i < list.size(); i++) {
                if (list.get(i).alarmId == newItem.alarmId) {
                    list.remove(i);
                    break;
                }
            }
            list.add(newItem);
        }
        saveAllAlarms(context, list);
    }

    public static synchronized void removeAlarm(Context context, int alarmId) {
        List<AlarmItem> list = getAllAlarms(context);
        boolean changed = false;
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i).alarmId == alarmId) {
                list.remove(i);
                changed = true;
                break;
            }
        }
        if (changed) {
            saveAllAlarms(context, list);
        }
    }

    public static synchronized List<AlarmItem> removeAlarmsForRoutine(Context context, String routineId) {
        List<AlarmItem> list = getAllAlarms(context);
        List<AlarmItem> removed = new ArrayList<>();
        List<AlarmItem> kept = new ArrayList<>();
        for (AlarmItem item : list) {
            if (item.routineId.equals(routineId)) {
                removed.add(item);
            } else {
                kept.add(item);
            }
        }
        saveAllAlarms(context, kept);
        return removed;
    }

    public static synchronized List<AlarmItem> removeAlarmsForTimeSlot(Context context, String timeSlotId) {
        List<AlarmItem> list = getAllAlarms(context);
        List<AlarmItem> removed = new ArrayList<>();
        List<AlarmItem> kept = new ArrayList<>();
        for (AlarmItem item : list) {
            if (item.timeSlotId.equals(timeSlotId)) {
                removed.add(item);
            } else {
                kept.add(item);
            }
        }
        saveAllAlarms(context, kept);
        return removed;
    }

    public static synchronized void cleanPastAlarms(Context context) {
        List<AlarmItem> list = getAllAlarms(context);
        long now = System.currentTimeMillis();
        List<AlarmItem> upcoming = new ArrayList<>();
        for (AlarmItem item : list) {
            if (item.triggerTimeMillis > now - (15 * 60 * 1000L)) { // Keep alarms triggered in last 15 mins for active
                                                                    // state
                upcoming.add(item);
            }
        }
        saveAllAlarms(context, upcoming);
    }

    // ================= DISMISSED OCCURRENCES =================

    public static synchronized void markOccurrenceDismissed(Context context, int alarmId) {
        SharedPreferences prefs = getPrefs(context);
        Set<String> set = new HashSet<>(prefs.getStringSet(KEY_DISMISSED, new HashSet<>()));
        set.add(String.valueOf(alarmId));
        prefs.edit().putStringSet(KEY_DISMISSED, set).apply();
    }

    public static synchronized boolean isOccurrenceDismissed(Context context, int alarmId) {
        Set<String> set = getPrefs(context).getStringSet(KEY_DISMISSED, new HashSet<>());
        return set != null && set.contains(String.valueOf(alarmId));
    }

    // ================= ACTIVE ALARM SESSION PERSISTENCE =================

    public static synchronized void saveActiveSession(Context context, JSONObject sessionData) {
        getPrefs(context).edit()
                .putString(KEY_ACTIVE_SESSION, sessionData != null ? sessionData.toString() : "")
                .apply();
    }

    public static synchronized JSONObject getActiveSession(Context context) {
        String raw = getPrefs(context).getString(KEY_ACTIVE_SESSION, "");
        if (raw == null || raw.isEmpty())
            return null;
        try {
            return new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    public static synchronized void clearActiveSession(Context context) {
        getPrefs(context).edit().remove(KEY_ACTIVE_SESSION).apply();
    }

    // ================= ALARM SETTINGS =================

    public static AlarmSettings getSettings(Context context) {
        SharedPreferences prefs = getSettingsPrefs(context);
        AlarmSettings settings = new AlarmSettings();
        settings.startAlarmEnabled = prefs.getBoolean(KEY_START_ALARM, true);
        settings.endAlarmEnabled = prefs.getBoolean(KEY_END_ALARM, true);
        settings.ringDurationMinutes = prefs.getInt(KEY_RING_DURATION, 3);
        settings.silentIntervalMinutes = prefs.getInt(KEY_SILENT_INTERVAL, 2);
        settings.vibrationEnabled = prefs.getBoolean(KEY_VIBRATION, true);
        settings.alarmSound = prefs.getString(KEY_ALARM_SOUND, "default");
        return settings;
    }

    public static void saveSettings(Context context, AlarmSettings settings) {
        SharedPreferences.Editor editor = getSettingsPrefs(context).edit();
        editor.putBoolean(KEY_START_ALARM, settings.startAlarmEnabled);
        editor.putBoolean(KEY_END_ALARM, settings.endAlarmEnabled);
        editor.putInt(KEY_RING_DURATION, settings.ringDurationMinutes);
        editor.putInt(KEY_SILENT_INTERVAL, settings.silentIntervalMinutes);
        editor.putBoolean(KEY_VIBRATION, settings.vibrationEnabled);
        editor.putString(KEY_ALARM_SOUND, settings.alarmSound != null ? settings.alarmSound : "default");
        editor.apply();
    }
}
