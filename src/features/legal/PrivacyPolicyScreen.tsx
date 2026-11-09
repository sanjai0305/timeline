import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Bell, Database, Lock, Trash2, Mail, ExternalLink } from 'lucide-react';

export const SUPPORT_EMAIL = 'support@routineplanner.app';
export const APP_VERSION = '1.0.0';
export const LAST_UPDATED = 'November 2026';

export const PrivacyPolicyScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-text-primary px-5 pt-3 pb-24 max-w-md mx-auto">
      {/* Top Header */}
      <header className="flex items-center space-x-3 py-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-white hover:bg-white/5 active:scale-95 transition-all"
          aria-label="Go back"
        >
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>
        <div className="flex items-center space-x-2">
          <Shield size={18} className="text-brand-purple" />
          <h1 className="text-xl font-bold text-white tracking-tight">Privacy Policy</h1>
        </div>
      </header>

      {/* Meta Card */}
      <div className="bg-surface rounded-2xl p-4 border border-white/5 mb-5 flex items-center justify-between text-xs text-text-muted">
        <div>
          <p className="font-semibold text-white">Routine Planner v{APP_VERSION}</p>
          <p className="mt-0.5">Effective & Last Updated: {LAST_UPDATED}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-status-success/15 border border-status-success/30 text-status-success font-semibold text-[10px]">
          Active
        </span>
      </div>

      {/* Policy Content Sections */}
      <div className="space-y-6 text-xs text-text-secondary leading-relaxed">
        {/* Section 1 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <span className="w-5 h-5 rounded-lg bg-brand-purple/20 text-brand-accent flex items-center justify-center text-xs">1</span>
            <h3>Information We Collect</h3>
          </div>
          <p className="mb-2">
            Routine Planner collects only the minimum information necessary to provide daily schedule planning and timely reminder notifications:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-1 text-text-muted">
            <li>
              <strong className="text-white">Account Information:</strong> If you choose to sign in, we collect your email address and display name via Firebase Authentication. Authentication is optional.
            </li>
            <li>
              <strong className="text-white">Routine & Timetable Data:</strong> Routine names, active date ranges, activity titles, categories, and scheduled start and end times.
            </li>
            <li>
              <strong className="text-white">Reminder Preferences:</strong> Per-slot notification toggles (enabled/disabled) and chosen advance reminder intervals (e.g., 5, 10, 15, or 30 minutes before).
            </li>
            <li>
              <strong className="text-white">Local Technical Data:</strong> Local storage identifiers and database schema versions required to keep your data saved on your device.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <span className="w-5 h-5 rounded-lg bg-brand-purple/20 text-brand-accent flex items-center justify-center text-xs">2</span>
            <h3>How Information Is Used</h3>
          </div>
          <p className="mb-2">We use the collected information exclusively to:</p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-text-muted">
            <li>Display your daily timetable and calculate routine statistics (active days, total slots).</li>
            <li>Trigger native on-device reminder alarms at your specified times.</li>
            <li>Synchronize collaborative timelines across your authorized devices if logged in.</li>
            <li>Maintain app reliability and offline functionality.</li>
          </ul>
        </section>

        {/* Section 3 - Critical Local Alarm Explanation */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-brand-purple/20 bg-brand-purple/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Bell size={16} className="text-brand-accent" />
            <h3>Local Notifications & Alarms</h3>
          </div>
          <p className="mb-2">
            <strong>Routine reminders are scheduled and triggered 100% locally on your Android device.</strong>
          </p>
          <p className="text-text-muted mb-2">
            When you configure a reminder for an activity, the app registers a local alarm directly with your device&apos;s native Android Notification Manager.
          </p>
          <p className="text-text-muted">
            The application does NOT transmit your routine reminder schedule, activity titles, or alarm timestamps to any external push notification server, advertising network, or third-party alarm service. Reminders trigger on time even without an active internet connection.
          </p>
        </section>

        {/* Section 4 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Database size={16} className="text-brand-purple" />
            <h3>Data Storage & Boundaries</h3>
          </div>
          <div className="space-y-2 text-text-muted">
            <p>
              <strong className="text-white">1. Local Device Storage:</strong> All routines and timetable entries are stored locally on your device in a private SQLite database (Android) or IndexedDB sandbox (browser). This data remains accessible offline.
            </p>
            <p>
              <strong className="text-white">2. Cloud Synchronization (Optional):</strong> If you authenticate, your collaborative timelines and events are synchronized to Google Cloud Firestore under strict security rules.
            </p>
            <p>
              <strong className="text-white">3. Authentication Credentials:</strong> Handled securely by Google Firebase Authentication. Passwords are never stored or seen in plaintext by Routine Planner.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Lock size={16} className="text-brand-purple" />
            <h3>Data Sharing & Disclosure</h3>
          </div>
          <p className="text-text-muted">
            We do NOT sell, rent, trade, or share your routine planning data, schedule information, or personal identifiers with third-party advertisers or data brokers. Data is accessed only by you and any collaborative members you explicitly invite to your shared timelines.
          </p>
        </section>

        {/* Section 6 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Shield size={16} className="text-brand-purple" />
            <h3>Data Security</h3>
          </div>
          <p className="text-text-muted">
            We implement standard security practices including Android application sandboxing, encrypted HTTPS transport for cloud synchronization, Firebase ID token verification on backend endpoints, and Cloud Firestore role-based access control. However, no electronic storage or transmission is 100% immune to potential risks.
          </p>
        </section>

        {/* Section 7 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Trash2 size={16} className="text-status-danger" />
            <h3>Data Deletion & User Rights</h3>
          </div>
          <ul className="list-disc list-inside space-y-1.5 pl-1 text-text-muted">
            <li>
              <strong className="text-white">Delete Individual Routines:</strong> You can delete any routine or time slot directly from the app interface at any time.
            </li>
            <li>
              <strong className="text-white">Reset Local Database:</strong> Use the &quot;Reset Database&quot; option in Settings &amp; Profile to immediately wipe all local SQLite data and cancel pending notifications.
            </li>
            <li>
              <strong className="text-white">Account Deletion:</strong> If you wish to delete your cloud account and associated cloud data, please send a deletion request to our support email below.
            </li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-white font-bold text-sm mb-1.5">Children&apos;s Privacy</h3>
          <p className="text-text-muted">
            Routine Planner is intended for general productivity. We do not knowingly collect personal information from children under 13 years of age.
          </p>
        </section>

        {/* Section 9 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-white font-bold text-sm mb-1.5">Changes to This Policy</h3>
          <p className="text-text-muted">
            We may periodically update this Privacy Policy. The latest version will always be accessible directly within this screen in the app.
          </p>
        </section>

        {/* Section 10 */}
        <section className="bg-surface rounded-2xl p-4 border border-brand-purple/30">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Mail size={16} className="text-brand-accent" />
            <h3>Contact Us</h3>
          </div>
          <p className="text-text-muted mb-2">
            For any questions, concerns, or data deletion inquiries regarding this Privacy Policy:
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-brand-purple/20 text-brand-accent font-semibold hover:bg-brand-purple/30 transition-colors"
          >
            <span>{SUPPORT_EMAIL}</span>
            <ExternalLink size={12} />
          </a>
        </section>
      </div>
    </div>
  );
};

