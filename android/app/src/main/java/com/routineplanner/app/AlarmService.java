package com.timeline;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class AlarmService extends Service {
    private static final String TAG = "AlarmService";

    public static final String CHANNEL_ID = "routine_repeating_alarm_channel";
    public static final String CHANNEL_NAME = "Routine Repeating Alarms";
    public static final int NOTIFICATION_ID = 888888;

    public static final String ACTION_START_ALARM = "com.timeline.ACTION_START_ALARM";
    public static final String ACTION_STOP = "com.timeline.ACTION_STOP";

    private enum AlarmState {
        IDLE,
        RINGING,
        SILENT,
        STOPPED
    }

    private AlarmState currentState = AlarmState.IDLE;
    private MediaPlayer mediaPlayer = null;
    private Vibrator vibrator = null;
    private PowerManager.WakeLock wakeLock = null;
    private Handler cycleHandler = null;
    private Runnable cycleRunnable = null;

    // Active session details
    private final List<Integer> activeAlarmIds = new ArrayList<>();
    private String routineName = "";
    private String activityName = "";
    private String eventType = "START"; // "START", "END", or "GROUPED"
    private String startTime = "";
    private String endTime = "";
    private String scheduledTimeStr = "";
    private String groupedEventsDescription = "";

    // Configurable timing (defaults: 3 min ring, 2 min silent)
    private long ringDurationMs = 3 * 60 * 1000L;
    private long silentIntervalMs = 2 * 60 * 1000L;
    private boolean vibrationEnabled = true;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "AlarmService created");

        cycleHandler = new Handler(Looper.getMainLooper());
        initVibrator();
        acquireWakeLock();
        createNotificationChannel();
    }

    private void initVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vm != null) {
                vibrator = vm.getDefaultVibrator();
            }
        } else {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null && (wakeLock == null || !wakeLock.isHeld())) {
                wakeLock = pm.newWakeLock(
                        PowerManager.PARTIAL_WAKE_LOCK,
                        "RoutinePlanner:AlarmForegroundWakeLock");
                // Keep wake lock for up to 60 minutes
                wakeLock.acquire(60 * 60 * 1000L);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring wake lock", e);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error releasing wake lock", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Ongoing repeating alarms for scheduled routine activities");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#8B43EF"));
                channel.enableVibration(false); // Vibration handled manually by service to allow 2-min silent interval
                channel.setSound(null, null); // Sound handled manually by MediaPlayer to allow 2-min silent interval
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            // Service recreated by system; recover persisted session
            recoverActiveSession();
            return START_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            Log.d(TAG, "Received ACTION_STOP");
            stopActiveAlarm();
            return START_NOT_STICKY;
        }

        // Load configured alarm timing settings
        AlarmStorage.AlarmSettings settings = AlarmStorage.getSettings(this);
        ringDurationMs = settings.ringDurationMinutes * 60 * 1000L;
        silentIntervalMs = settings.silentIntervalMinutes * 60 * 1000L;
        vibrationEnabled = settings.vibrationEnabled;

        int alarmId = intent.getIntExtra("alarmId", (int) System.currentTimeMillis());
        String newRoutineName = intent.getStringExtra("routineName");
        String newActivityName = intent.getStringExtra("activityName");
        String newEventType = intent.getStringExtra("eventType");
        String newStartTime = intent.getStringExtra("startTime");
        String newEndTime = intent.getStringExtra("endTime");

        if (newRoutineName == null || newRoutineName.isEmpty())
            newRoutineName = "My Routine";
        if (newActivityName == null || newActivityName.isEmpty())
            newActivityName = "Routine Activity";
        if (newEventType == null)
            newEventType = "START";
        if (newStartTime == null)
            newStartTime = "";
        if (newEndTime == null)
            newEndTime = "";

        // If alarm is ALREADY running and a new simultaneous alarm arrives:
        // Merge them into one combined session without creating competing audio
        // streams!
        if (currentState == AlarmState.RINGING || currentState == AlarmState.SILENT) {
            if (!activeAlarmIds.contains(alarmId)) {
                activeAlarmIds.add(alarmId);
            }

            // Build grouped description (e.g. "EXERCISE ENDED • BREAKFAST STARTED")
            String prevDesc = !groupedEventsDescription.isEmpty()
                    ? groupedEventsDescription
                    : formatEventLabel(activityName, eventType);
            String incomingDesc = formatEventLabel(newActivityName, newEventType);

            if (!prevDesc.contains(incomingDesc)) {
                groupedEventsDescription = prevDesc + " • " + incomingDesc;
            }
            eventType = "GROUPED";

            Log.d(TAG, "Grouped simultaneous alarm: " + groupedEventsDescription);
            updateNotification();
            persistSession();
            return START_STICKY;
        }

        // New Alarm Session
        activeAlarmIds.clear();
        activeAlarmIds.add(alarmId);
        routineName = newRoutineName;
        activityName = newActivityName;
        eventType = newEventType;
        startTime = newStartTime;
        endTime = newEndTime;
        scheduledTimeStr = "START".equals(eventType) ? startTime : endTime;
        groupedEventsDescription = "";

        persistSession();

        // Start Foreground Service immediately
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // Begin the Repeating Cycle in RINGING phase
        startRingingPhase();

        return START_STICKY;
    }

    private String formatEventLabel(String actName, String evType) {
        if ("END".equals(evType)) {
            return actName.toUpperCase() + " ENDED";
        }
        return actName.toUpperCase() + " STARTED";
    }

    /**
     * Phase 1 / Repeating Ringing Phase:
     * - Loops alarm audio continuously
     * - Runs vibration pattern
     * - Ongoing notification with [ STOP ALARM ]
     * - Next transition after ringDurationMs (3 minutes)
     */
    private void startRingingPhase() {
        currentState = AlarmState.RINGING;
        Log.d(TAG, "Starting RINGING phase for " + (ringDurationMs / 1000) + " seconds");

        startAudioPlayback();
        startVibration();
        updateNotification();

        if (cycleRunnable != null) {
            cycleHandler.removeCallbacks(cycleRunnable);
        }

        cycleRunnable = new Runnable() {
            @Override
            public void run() {
                startSilentPhase();
            }
        };
        cycleHandler.postDelayed(cycleRunnable, ringDurationMs);
    }

    /**
     * Phase 2 / Repeating Silent Phase:
     * - Stops audio and vibration completely
     * - Keeps ongoing notification visible with [ STOP ALARM ]
     * - Next transition after silentIntervalMs (2 minutes)
     */
    private void startSilentPhase() {
        currentState = AlarmState.SILENT;
        Log.d(TAG, "Starting SILENT phase for " + (silentIntervalMs / 1000) + " seconds");

        stopAudioPlayback();
        stopVibration();
        updateNotification();

        if (cycleRunnable != null) {
            cycleHandler.removeCallbacks(cycleRunnable);
        }

        cycleRunnable = new Runnable() {
            @Override
            public void run() {
                // Loop back to ringing phase
                startRingingPhase();
            }
        };
        cycleHandler.postDelayed(cycleRunnable, silentIntervalMs);
    }

    // ================= AUDIO MANAGEMENT =================

    private void startAudioPlayback() {
        stopAudioPlayback(); // Ensure no overlapping players

        try {
            Uri alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmSoundUri == null) {
                alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            if (alarmSoundUri == null) {
                alarmSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            }

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, alarmSoundUri);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setLooping(true);

            mediaPlayer.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                @Override
                public boolean onError(MediaPlayer mp, int what, int extra) {
                    Log.e(TAG, "MediaPlayer error: what=" + what + ", extra=" + extra);
                    stopAudioPlayback();
                    return true;
                }
            });

            mediaPlayer.prepare();
            mediaPlayer.start();
            Log.d(TAG, "Alarm MediaPlayer started with USAGE_ALARM (looping)");
        } catch (Exception e) {
            Log.e(TAG, "Error starting MediaPlayer", e);
        }
    }

    private void stopAudioPlayback() {
        try {
            if (mediaPlayer != null) {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.reset();
                mediaPlayer.release();
                mediaPlayer = null;
                Log.d(TAG, "MediaPlayer released");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error releasing MediaPlayer", e);
            mediaPlayer = null;
        }
    }

    // ================= VIBRATION MANAGEMENT =================

    private void startVibration() {
        if (!vibrationEnabled || vibrator == null || !vibrator.hasVibrator()) {
            return;
        }

        try {
            long[] pattern = new long[] { 0, 800, 400, 800, 400, 800 };
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 1));
            } else {
                vibrator.vibrate(pattern, 1);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting vibration", e);
        }
    }

    private void stopVibration() {
        try {
            if (vibrator != null) {
                vibrator.cancel();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping vibration", e);
        }
    }

    // ================= NOTIFICATION & STOP ACTION =================

    private Notification buildNotification() {
        int appIcon = getApplicationInfo().icon;
        if (appIcon == 0)
            appIcon = android.R.drawable.ic_lock_idle_alarm;

        // STOP PendingIntent (directly sends ACTION_STOP to AlarmService)
        Intent stopIntent = new Intent(this, AlarmService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
                this,
                NOTIFICATION_ID,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Content Tap PendingIntent (opens MainActivity)
        Intent contentIntent = new Intent(this, MainActivity.class);
        contentIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this,
                NOTIFICATION_ID + 1,
                contentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Build Title
        String title;
        if ("GROUPED".equals(eventType) && !groupedEventsDescription.isEmpty()) {
            title = "⏰ " + groupedEventsDescription;
        } else if ("END".equals(eventType)) {
            title = "🏁 " + activityName + " (Ended)";
        } else {
            title = "⏰ " + activityName + " (Starting Now)";
        }

        // Build Body Text
        String timeDisplay = (!startTime.isEmpty() && !endTime.isEmpty()) ? startTime + " – " + endTime
                : scheduledTimeStr;
        String statusText = (currentState == AlarmState.SILENT)
                ? "⏸️ Paused (Resumes in 2 min)"
                : "🔔 Alarm Ringing";

        String body = routineName + "\n" + timeDisplay + "\n" + statusText;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(appIcon)
                .setContentTitle(title)
                .setContentText(timeDisplay + " • " + statusText)
                .setSubText("ROUTINE PLANNER")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body).setBigContentTitle(title))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(contentPendingIntent)
                // PROMINENT STOP ALARM ACTION BUTTON
                .addAction(
                        android.R.drawable.ic_menu_close_clear_cancel,
                        "🛑 STOP ALARM",
                        stopPendingIntent);

        return builder.build();
    }

    private void updateNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, buildNotification());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating notification", e);
        }
    }

    // ================= ALARM STOP & DISMISSAL =================

    public void stopActiveAlarm() {
        currentState = AlarmState.STOPPED;
        Log.d(TAG, "stopActiveAlarm executing: stopping audio, vibration, and timers");

        if (cycleHandler != null && cycleRunnable != null) {
            cycleHandler.removeCallbacks(cycleRunnable);
            cycleRunnable = null;
        }

        stopAudioPlayback();
        stopVibration();

        // Mark all active alarm occurrences as dismissed so they do not re-trigger
        for (int alarmId : activeAlarmIds) {
            AlarmStorage.markOccurrenceDismissed(this, alarmId);
            AlarmStorage.removeAlarm(this, alarmId);
        }

        AlarmStorage.clearActiveSession(this);
        releaseWakeLock();

        // Cancel notification and stop foreground service
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
        } catch (Exception ignored) {
        }

        stopForeground(true);
        stopSelf();
    }

    private void persistSession() {
        try {
            JSONObject obj = new JSONObject();
            obj.put("routineName", routineName);
            obj.put("activityName", activityName);
            obj.put("eventType", eventType);
            obj.put("startTime", startTime);
            obj.put("endTime", endTime);
            obj.put("groupedDesc", groupedEventsDescription);
            AlarmStorage.saveActiveSession(this, obj);
        } catch (Exception ignored) {
        }
    }

    private void recoverActiveSession() {
        JSONObject session = AlarmStorage.getActiveSession(this);
        if (session != null) {
            routineName = session.optString("routineName", "My Routine");
            activityName = session.optString("activityName", "Routine Activity");
            eventType = session.optString("eventType", "START");
            startTime = session.optString("startTime", "");
            endTime = session.optString("endTime", "");
            groupedEventsDescription = session.optString("groupedDesc", "");

            startRingingPhase();
        } else {
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "AlarmService destroyed");
        stopAudioPlayback();
        stopVibration();
        if (cycleHandler != null && cycleRunnable != null) {
            cycleHandler.removeCallbacks(cycleRunnable);
        }
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
