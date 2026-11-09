import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Clock,
  Moon,
  Bell,
  Smartphone,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  Cloud,
  LogIn,
  LogOut,
  ShieldCheck,
  Shield,
  FileText,
  Info,
  ChevronRight,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useRoutineStore } from '@/store/routineStore';
import { useAuthStore } from '@/store/authStore';
import { getRoutineRepository } from '@/database';
import { AuthModal } from '@/components/auth/AuthModal';
import { notificationService, ExactAlarmItem } from '@/services/notificationService';

export const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    timeFormat,
    setTimeFormat,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useSettingsStore();

  const { routines, resetDatabase, fetchRoutines } = useRoutineStore();
  const { user, isAuthenticated, signOut } = useAuthStore();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean>(true);
  const [exactAlarmGranted, setExactAlarmGranted] = useState<boolean>(true);
  const [upcomingAlarms, setUpcomingAlarms] = useState<ExactAlarmItem[]>([]);
  const [alarmSettings, setAlarmSettings] = useState({
    startAlarmEnabled: true,
    endAlarmEnabled: true,
    ringDurationMinutes: 3,
    silentIntervalMinutes: 2,
    vibrationEnabled: true,
    alarmSound: 'default',
  });

  const loadAlarmStatus = async () => {
    try {
      const perms = await notificationService.checkPermissions();
      setNotifGranted(perms.notifications);
      setExactAlarmGranted(perms.exactAlarm);
      const settings = await notificationService.getAlarmSettings();
      setAlarmSettings(settings);
      const upcoming = await notificationService.getUpcomingAlarms();
      setUpcomingAlarms(upcoming);
    } catch (e) {
      console.warn('Failed to load alarm settings:', e);
    }
  };

  const handleToggleAlarmSetting = async (key: string, value: any) => {
    const updated = { ...alarmSettings, [key]: value };
    setAlarmSettings(updated);
    await notificationService.updateAlarmSettings(updated);
    for (const r of routines) {
      if (r.is_active === 1) {
        await notificationService.scheduleRoutineReminders(r);
      }
    }
    await loadAlarmStatus();
    showStatus('Alarm settings saved');
  };

  useEffect(() => {
    loadAlarmStatus();
  }, [routines]);

  const handleRequestNotifPermission = async () => {
    const granted = await notificationService.requestNotificationPermission();
    setNotifGranted(granted);
    if (granted) {
      showStatus('Notification permission enabled!');
    } else {
      showStatus('Notification permission not granted.');
    }
    await loadAlarmStatus();
  };

  const handleOpenExactAlarmSettings = async () => {
    await notificationService.requestExactAlarmPermission();
    showStatus('Opening Android Exact Alarm Settings...');
  };

  const handleTestAlarm = async () => {
    const success = await notificationService.triggerTestAlarm();
    if (success) {
      showStatus('⏰ Test alarm armed! Sound & vibration will ring in 3s.');
    } else {
      showStatus('Test alarm triggered.');
    }
    setTimeout(loadAlarmStatus, 4000);
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(routines, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `routine_planner_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showStatus('Routines exported successfully!');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const repo = await getRoutineRepository();
          await repo.importRoutines(imported);
          await fetchRoutines();
          showStatus(`Imported ${imported.length} routines!`);
        } else {
          alert('Invalid backup file format');
        }
      } catch {
        alert('Failed to parse backup file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary px-5 pt-3 pb-24 flex flex-col justify-between max-w-md mx-auto relative">
      <div>
        {/* Header */}
        <header className="py-2 mb-4">
          <h1 className="text-xl font-bold text-white tracking-tight">Profile & Settings</h1>
        </header>

        {statusMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-brand-purple/20 border border-brand-purple/40 text-brand-accent text-xs font-medium flex items-center space-x-2 animate-in fade-in duration-150">
            <CheckCircle size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* User Card */}
        <div className="w-full bg-surface rounded-3xl p-4 border border-white/5 flex items-center justify-between mb-5 shadow-card">
          <div className="flex items-center space-x-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-purple-gradient flex items-center justify-center text-white shadow-glow-purple-sm flex-shrink-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Avatar'}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">
                {isAuthenticated ? user?.displayName || user?.email?.split('@')[0] : 'Guest / Local User'}
              </h2>
              <p className="text-xs text-text-secondary truncate mt-0.5">
                {isAuthenticated ? user?.email : 'Offline SQLite Storage'}
              </p>
            </div>
          </div>

          <div>
            {isAuthenticated ? (
              <button
                onClick={() => signOut()}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-white transition-colors"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-gradient text-white text-xs font-semibold shadow-glow-purple-sm active:scale-95 transition-all flex items-center space-x-1.5"
              >
                <LogIn size={14} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Cloud & Collaboration Banner */}
        <div className="mb-5 p-3.5 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Cloud size={20} className="text-brand-accent flex-shrink-0" />
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white">Firebase Project</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-purple/30 text-brand-accent font-semibold">
                  time-line-5bbcd
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {isAuthenticated ? 'Real-time collaborative sync active' : 'Sign in to sync timelines with others'}
              </p>
            </div>
          </div>
          <ShieldCheck size={18} className="text-status-success flex-shrink-0 ml-2" />
        </div>

        {/* Preferences Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
              Preferences
            </h3>
            <div className="bg-surface rounded-3xl p-1.5 border border-white/5 divide-y divide-white/5">
              {/* Time Format */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-brand-purple/15 text-brand-accent">
                    <Clock size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Time Format</span>
                    <p className="text-[11px] text-text-muted">Display 12h AM/PM or 24h</p>
                  </div>
                </div>

                <div className="flex bg-[#121226] p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setTimeFormat('12h')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      timeFormat === '12h'
                        ? 'bg-brand-purple text-white shadow-sm'
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    12h
                  </button>
                  <button
                    onClick={() => setTimeFormat('24h')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      timeFormat === '24h'
                        ? 'bg-brand-purple text-white shadow-sm'
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    24h
                  </button>
                </div>
              </div>

              {/* Theme Preference */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-brand-purple/15 text-brand-accent">
                    <Moon size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Dark Theme</span>
                    <p className="text-[11px] text-text-muted">Midnight Navy Palette</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-brand-accent px-2.5 py-1 rounded-lg bg-brand-purple/15">
                  Deep Dark
                </span>
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-brand-purple/15 text-brand-accent">
                    <Bell size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    <p className="text-[11px] text-text-muted">Daily routine reminders</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    notificationsEnabled ? 'bg-brand-purple' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Data & Backup */}
          <div>
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
              Data Management
            </h3>
            <div className="bg-surface rounded-3xl p-1.5 border border-white/5 divide-y divide-white/5">
              <button
                onClick={handleExportData}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors rounded-2xl"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
                    <Download size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Export Backup</span>
                    <p className="text-[11px] text-text-muted">Save routines as JSON file</p>
                  </div>
                </div>
              </button>

              <label className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors rounded-2xl cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Upload size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Import Backup</span>
                    <p className="text-[11px] text-text-muted">Restore routines from JSON</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>

              <button
                onClick={async () => {
                  if (window.confirm('Delete all routines and reset database?')) {
                    await resetDatabase();
                    showStatus('All routine data cleared.');
                  }
                }}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-status-danger/10 transition-colors rounded-2xl text-status-danger"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-status-danger/15 text-status-danger">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-status-danger">Reset Database</span>
                    <p className="text-[11px] text-text-muted">Permanently wipe local data</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Alarm Management Settings Section */}
          <div>
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
              Alarm Settings (Repeating Start &amp; End Alarms)
            </h3>
            <div className="bg-surface rounded-3xl p-4 border border-white/5 space-y-4">
              {/* Repeating Cycle Description Banner */}
              <div className="p-3 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 text-xs">
                <div className="flex items-center space-x-2 text-white font-bold mb-1">
                  <Bell size={15} className="text-brand-accent" />
                  <span>Native Repeating Alarm Cycle</span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Every start and end alarm rings continuously for <strong className="text-white">3 minutes</strong>, pauses for <strong className="text-white">2 minutes</strong>, and repeats indefinitely until <strong className="text-rose-400">STOP</strong> is pressed.
                </p>
              </div>

              {/* Toggles & Permissions Grid */}
              <div className="space-y-3 divide-y divide-white/5">
                {/* Start Alarm Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs font-semibold text-white">Activity Start Alarm</span>
                    <p className="text-[10px] text-text-muted">Rings when activity starts</p>
                  </div>
                  <button
                    onClick={() => handleToggleAlarmSetting('startAlarmEnabled', !alarmSettings.startAlarmEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      alarmSettings.startAlarmEnabled ? 'bg-brand-purple' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        alarmSettings.startAlarmEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* End Alarm Toggle */}
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <span className="text-xs font-semibold text-white">Activity End Alarm</span>
                    <p className="text-[10px] text-text-muted">Rings when activity finishes</p>
                  </div>
                  <button
                    onClick={() => handleToggleAlarmSetting('endAlarmEnabled', !alarmSettings.endAlarmEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      alarmSettings.endAlarmEnabled ? 'bg-brand-purple' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        alarmSettings.endAlarmEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Vibration Toggle */}
                <div className="flex items-center justify-between pt-3">
                  <div>
                    <span className="text-xs font-semibold text-white">Vibration</span>
                    <p className="text-[10px] text-text-muted">Vibrate during 3-min ring</p>
                  </div>
                  <button
                    onClick={() => handleToggleAlarmSetting('vibrationEnabled', !alarmSettings.vibrationEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      alarmSettings.vibrationEnabled ? 'bg-brand-purple' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        alarmSettings.vibrationEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Fixed Intervals & Permissions Status */}
                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-semibold text-text-secondary">Ring Duration</span>
                  <span className="text-[11px] font-bold text-white px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10">
                    {alarmSettings.ringDurationMinutes} Minutes
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-semibold text-text-secondary">Silent Interval</span>
                  <span className="text-[11px] font-bold text-white px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10">
                    {alarmSettings.silentIntervalMinutes} Minutes
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-semibold text-text-secondary">Notifications Permission</span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      notifGranted
                        ? 'bg-status-success/15 border-status-success/30 text-status-success'
                        : 'bg-status-danger/15 border-status-danger/30 text-status-danger'
                    }`}
                  >
                    {notifGranted ? 'Granted' : 'Missing'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-semibold text-text-secondary">Exact Alarm Permission</span>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                      exactAlarmGranted
                        ? 'bg-status-success/15 border-status-success/30 text-status-success'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {exactAlarmGranted ? 'Granted' : 'Action Required'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={handleTestAlarm}
                  className="w-full py-2.5 px-4 rounded-xl bg-purple-gradient text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-glow-purple-sm active:scale-[0.98] transition-all"
                >
                  <Bell size={15} />
                  <span>Test Repeating Alarm (Fires in 3s)</span>
                </button>

                {!notifGranted && (
                  <button
                    type="button"
                    onClick={handleRequestNotifPermission}
                    className="w-full py-2 px-3 rounded-xl bg-brand-purple/20 border border-brand-purple/40 text-brand-accent text-xs font-semibold hover:bg-brand-purple/30 transition-colors"
                  >
                    Grant Notifications Permission
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenExactAlarmSettings}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white text-xs font-medium transition-colors"
                >
                  Open Android Exact Alarm Settings
                </button>
              </div>

              {/* Upcoming Scheduled Alarms */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Clock size={14} className="text-brand-accent" />
                    <span>Upcoming Alarms ({upcomingAlarms.length})</span>
                  </h4>
                  <span className="text-[10px] text-text-muted">Start &amp; End</span>
                </div>

                {upcomingAlarms.length > 0 ? (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {upcomingAlarms.slice(0, 15).map((alarm, idx) => (
                      <div
                        key={alarm.alarmId || idx}
                        className="p-2.5 rounded-xl bg-[#131326] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                alarm.eventType === 'END'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {alarm.eventType || 'START'}
                            </span>
                            <span className="font-semibold text-white truncate">
                              {alarm.activityName}
                            </span>
                          </div>
                          <span className="text-[10px] text-text-muted mt-0.5">
                            {alarm.dateStr} • {alarm.eventType === 'END' ? alarm.endTime : alarm.startTime}
                          </span>
                        </div>
                        <span className="text-[10px] text-brand-accent font-semibold px-2 py-0.5 rounded-md bg-brand-purple/20 flex-shrink-0">
                          {alarm.eventType === 'END' ? 'End Alarm' : 'Start Alarm'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted italic bg-[#131326] p-2.5 rounded-xl border border-white/5">
                    No future alarms currently scheduled. Create or activate a routine to schedule start and end alarms across all days.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Legal & About Section */}
          <div>
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
              Legal &amp; Application Info
            </h3>
            <div className="bg-surface rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              <button
                onClick={() => navigate('/privacy')}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent">
                    <Shield size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Privacy Policy</span>
                    <p className="text-[11px] text-text-muted">Data collection, local alarm &amp; privacy terms</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-muted" />
              </button>

              <button
                onClick={() => navigate('/terms')}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent">
                    <FileText size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">Terms &amp; Conditions</span>
                    <p className="text-[11px] text-text-muted">Usage agreements &amp; user responsibilities</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-muted" />
              </button>

              <button
                onClick={() => navigate('/about')}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent">
                    <Info size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">About Routine Planner</span>
                    <p className="text-[11px] text-text-muted">Version 1.0.0 • Offline Ready Architecture</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-muted" />
              </button>
            </div>
          </div>

          {/* About App */}
          <div>
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 px-1">
              Architecture & Deployment
            </h3>
            <div className="bg-surface rounded-3xl p-4 border border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-white/5 text-text-secondary">
                  <Smartphone size={18} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white">Routine Planner Android</span>
                  <p className="text-[11px] text-text-muted">Capacitor Native + SQLite + Vercel</p>
                </div>
              </div>
              <span className="text-[10px] text-brand-accent bg-brand-purple/15 border border-brand-purple/30 px-2.5 py-1 rounded-full font-semibold">
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};
