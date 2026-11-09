package com.routineplanner.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import androidx.core.content.ContextCompat;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (AlarmService.ACTION_STOP.equals(action)) {
            Log.d(TAG, "Forwarding ACTION_STOP to AlarmService");
            Intent stopIntent = new Intent(context, AlarmService.class);
            stopIntent.setAction(AlarmService.ACTION_STOP);
            ContextCompat.startForegroundService(context, stopIntent);
            return;
        }

        int alarmId = intent.getIntExtra("alarmId", (int) System.currentTimeMillis());

        // Check if this specific occurrence has already been manually dismissed
        if (AlarmStorage.isOccurrenceDismissed(context, alarmId)) {
            Log.d(TAG, "Alarm occurrence " + alarmId + " already dismissed; ignoring.");
            AlarmStorage.removeAlarm(context, alarmId);
            return;
        }

        String routineId = intent.getStringExtra("routineId");
        String routineName = intent.getStringExtra("routineName");
        String timeSlotId = intent.getStringExtra("timeSlotId");
        String activityName = intent.getStringExtra("activityName");
        String startTime = intent.getStringExtra("startTime");
        String endTime = intent.getStringExtra("endTime");
        String eventType = intent.getStringExtra("eventType");
        String dateStr = intent.getStringExtra("dateStr");

        if (routineName == null || routineName.isEmpty()) routineName = "My Routine";
        if (activityName == null || activityName.isEmpty()) activityName = "Routine Activity";
        if (eventType == null || eventType.isEmpty()) eventType = "START";
        if (startTime == null) startTime = "";
        if (endTime == null) endTime = "";
        if (dateStr == null) dateStr = "";

        Log.d(TAG, "Alarm triggered: " + activityName + " [" + eventType + "] at " + (eventType.equals("START") ? startTime : endTime));

        // Start native repeating foreground AlarmService
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.setAction(AlarmService.ACTION_START_ALARM);
        serviceIntent.putExtra("alarmId", alarmId);
        serviceIntent.putExtra("routineId", routineId);
        serviceIntent.putExtra("routineName", routineName);
        serviceIntent.putExtra("timeSlotId", timeSlotId);
        serviceIntent.putExtra("activityName", activityName);
        serviceIntent.putExtra("startTime", startTime);
        serviceIntent.putExtra("endTime", endTime);
        serviceIntent.putExtra("eventType", eventType);
        serviceIntent.putExtra("dateStr", dateStr);

        try {
            ContextCompat.startForegroundService(context, serviceIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start AlarmService", e);
        }
    }
}
