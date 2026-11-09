package com.routineplanner.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class AlarmStorage {
    private static final String PREF_NAME = "routine_planner_alarms";
    private static final String KEY_ALARMS = "active_alarms";

    public static class AlarmItem {
        public int alarmId;
        public String routineId;
        public String timeSlotId;
        public String activityName;
        public String startTime;
        public String endTime;
        public long triggerTimeMillis;
        public String dateStr;

        public AlarmItem() {}

        public JSONObject toJson() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("alarmId", alarmId);
                obj.put("routineId", routineId);
                obj.put("timeSlotId", timeSlotId);
                obj.put("activityName", activityName);
                obj.put("startTime", startTime);
                obj.put("endTime", endTime);
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
                item.timeSlotId = obj.optString("timeSlotId", "");
                item.activityName = obj.optString("activityName", "Routine Activity");
                item.startTime = obj.optString("startTime", "");
                item.endTime = obj.optString("endTime", "");
                item.triggerTimeMillis = obj.getLong("triggerTimeMillis");
                item.dateStr = obj.optString("dateStr", "");
                return item;
            } catch (Exception e) {
                return null;
            }
        }
    }

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

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
        } catch (Exception ignored) {}
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
        long now = System.currentTimeMillis();
        List<AlarmItem> list = getAllAlarms(context);
        List<AlarmItem> kept = new ArrayList<>();
        for (AlarmItem item : list) {
            if (item.triggerTimeMillis > (now - 60000)) { // keep if within last 1 min or future
                kept.add(item);
            }
        }
        saveAllAlarms(context, kept);
    }
}

