import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, Bell, Shield, Mail, ExternalLink } from 'lucide-react';
import { SUPPORT_EMAIL, APP_VERSION, LAST_UPDATED } from './PrivacyPolicyScreen';

export const TermsConditionsScreen: React.FC = () => {
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
          <FileText size={18} className="text-brand-purple" />
          <h1 className="text-xl font-bold text-white tracking-tight">Terms &amp; Conditions</h1>
        </div>
      </header>

      {/* Meta Card */}
      <div className="bg-surface rounded-2xl p-4 border border-white/5 mb-5 flex items-center justify-between text-xs text-text-muted">
        <div>
          <p className="font-semibold text-white">Routine Planner v{APP_VERSION}</p>
          <p className="mt-0.5">Effective Date: {LAST_UPDATED}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-brand-purple/20 border border-brand-purple/30 text-brand-accent font-semibold text-[10px]">
          Standard
        </span>
      </div>

      {/* Terms Content Sections */}
      <div className="space-y-6 text-xs text-text-secondary leading-relaxed">
        {/* Important Disclaimer Notice */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
          <div className="flex items-center space-x-2 font-bold mb-1.5 text-amber-300">
            <AlertTriangle size={16} />
            <span>Important Usage Notice</span>
          </div>
          <p className="leading-relaxed">
            Routine Planner is designed solely as a personal schedule organization and productivity tool. It is <strong>NOT</strong> an emergency alert system, medical reminder tool, life-safety monitor, or mission-critical alarm. Do not rely on it for critical events.
          </p>
        </div>

        {/* Section 1 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-white font-bold text-sm mb-1.5">1. Acceptance of Terms</h3>
          <p className="text-text-muted">
            By downloading, installing, or using the Routine Planner application, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please discontinue using the application.
          </p>
        </section>

        {/* Section 2 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-white font-bold text-sm mb-1.5">2. Use of Application &amp; User Responsibilities</h3>
          <ul className="list-disc list-inside space-y-1.5 pl-1 text-text-muted">
            <li>You agree to use Routine Planner only for lawful, personal, or collaborative scheduling purposes.</li>
            <li>You are solely responsible for entering accurate dates, times, and activities for your routines.</li>
            <li>You agree not to upload or share offensive, infringing, or harmful content when using collaborative timeline features.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Bell size={16} className="text-brand-accent" />
            <h3>3. Local Reminders &amp; Notification Permissions</h3>
          </div>
          <p className="text-text-muted mb-2">
            Routine Planner uses Android local notifications to alert you before scheduled activities. To receive reminders:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-text-muted">
            <li>You must grant notification permissions when prompted.</li>
            <li>Your device&apos;s battery management settings, power-saver modes, or Doze settings may delay or suppress notifications depending on manufacturer customizations.</li>
            <li>We do not guarantee that reminders will trigger under all device power states or operating system constraints.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-white font-bold text-sm mb-1.5">4. Account &amp; Authentication</h3>
          <p className="text-text-muted">
            If you create an account to use cloud synchronization, you are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
          </p>
        </section>

        {/* Section 5 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-white font-bold text-sm mb-1.5">5. Device Compatibility &amp; Service Availability</h3>
          <p className="text-text-muted">
            Routine Planner is built to operate offline first with local SQLite storage. We strive for high availability and performance, but we do not warrant that the application will be error-free, uninterrupted, or compatible with all hardware and Android OS versions.
          </p>
        </section>

        {/* Section 6 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Shield size={16} className="text-brand-purple" />
            <h3>6. Intellectual Property</h3>
          </div>
          <p className="text-text-muted">
            The application design, interface, software, icons, and branding are the intellectual property of the developer. You are granted a personal, non-exclusive, non-transferable license to use the app on your mobile device.
          </p>
        </section>

        {/* Section 7 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-white font-bold text-sm mb-1.5">7. Limitation of Liability</h3>
          <p className="text-text-muted">
            To the maximum extent permitted by applicable law, the developers of Routine Planner shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of, or inability to use, the application or its reminder alarms.
          </p>
        </section>

        {/* Section 8 */}
        <section className="bg-surface/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-white font-bold text-sm mb-1.5">8. Changes to Terms</h3>
          <p className="text-text-muted">
            We reserve the right to modify these terms at any time. Continued use of the application following any changes constitutes acceptance of the revised Terms and Conditions.
          </p>
        </section>

        {/* Section 9 */}
        <section className="bg-surface rounded-2xl p-4 border border-brand-purple/30">
          <div className="flex items-center space-x-2 mb-2 text-white font-bold text-sm">
            <Mail size={16} className="text-brand-accent" />
            <h3>Contact Information</h3>
          </div>
          <p className="text-text-muted mb-2">
            If you have questions regarding these Terms &amp; Conditions, please reach out to:
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

