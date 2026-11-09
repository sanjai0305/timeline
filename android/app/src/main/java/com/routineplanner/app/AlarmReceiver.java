package com.routineplanner.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "routine_exact_alarms";
    public static final String CHANNEL_NAME = "Routine Exact Alarms";

    @Override
    public void onReceive(Context context, Intent intent) {
        int alarmId = intent.getIntExtra("alarmId", (int) System.currentTimeMillis());
        String routineId = intent.getStringExtra("routineId");
        String timeSlotId = intent.getStringExtra("timeSlotId");
        String activityName = intent.getStringExtra("activityName");
        String startTime = intent.getStringExtra("startTime");
        String endTime = intent.getStringExtra("endTime");

        if (activityName == null || activityName.isEmpty()) {
            activityName = "Routine Activity";
        }
        if (startTime == null) startTime = "";
        if (endTime == null) endTime = "";

        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (alarmSound == null) {
            alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }

        long[] vibrationPattern = new long[]{0, 600, 250, 600, 250, 600};

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Audible exact-time routine reminders and alarms");
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#8B43EF"));
            channel.enableVibration(true);
            channel.setVibrationPattern(vibrationPattern);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build();
            channel.setSound(alarmSound, audioAttributes);

            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }

        // Tap action: open MainActivity
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (routineId != null) {
            launchIntent.putExtra("routineId", routineId);
        }
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                context,
                alarmId,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = "⏰ " + activityName;
        String timeRange = (!startTime.isEmpty() && !endTime.isEmpty()) ? startTime + " – " + endTime : startTime;
        String contentText = "Your scheduled activity starts now. " + (!timeRange.isEmpty() ? "(" + timeRange + ")" : "");

        int appIcon = context.getApplicationInfo().icon;
        if (appIcon == 0) appIcon = android.R.drawable.ic_lock_idle_alarm;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(appIcon)
                .setContentTitle(title)
                .setContentText(contentText)
                .setSubText("ROUTINE PLANNER")
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText("Your scheduled activity starts now.\n" + timeRange + "\nRoutine Planner")
                        .setBigContentTitle(title))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSound(alarmSound)
                .setVibrate(vibrationPattern)
                .setAutoCancel(true)
                .setContentIntent(contentPendingIntent);

        if (notificationManager != null) {
            notificationManager.notify(alarmId, builder.build());
        }

        // Clean up from storage
        AlarmStorage.removeAlarm(context, alarmId);
    }
}
