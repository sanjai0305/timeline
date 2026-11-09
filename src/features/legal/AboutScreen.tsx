import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  FileText,
  Smartphone,
  Database,
  Bell,
  ExternalLink,
} from 'lucide-react';
import { SUPPORT_EMAIL, APP_VERSION } from './PrivacyPolicyScreen';

export const AboutScreen: React.FC = () => {
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
        <h1 className="text-xl font-bold text-white tracking-tight">About</h1>
      </header>

      {/* Hero Brand Card */}
      <div className="w-full bg-surface rounded-3xl p-6 border border-white/5 flex flex-col items-center text-center mb-5 shadow-card relative overflow-hidden">
        <div className="w-20 h-20 rounded-2xl p-1 bg-surface border border-brand-purple/30 flex items-center justify-center shadow-glow-purple mb-3 overflow-hidden">
          <img src="/logo.png" alt="Routine Planner" className="w-full h-full object-cover rounded-xl" />
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">Routine Planner</h2>
        <p className="text-xs text-brand-accent font-semibold mt-0.5">Version {APP_VERSION} (Build 1)</p>
        <p className="text-xs text-text-secondary mt-2 max-w-[260px] leading-relaxed">
          A simple, elegant routine and timetable planning application designed for daily productivity.
        </p>
      </div>

      {/* Core Features */}
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">
          Key Capabilities
        </h3>

        <div className="bg-surface rounded-2xl p-3.5 border border-white/5 flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-brand-purple/20 text-brand-accent mt-0.5 flex-shrink-0">
            <Bell size={18} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Local Native Alarms</h4>
            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
              Timely reminders scheduled directly on your Android device. Works completely offline without external push servers.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-3.5 border border-white/5 flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-status-success/20 text-status-success mt-0.5 flex-shrink-0">
            <Database size={18} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Offline-First SQLite</h4>
            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
              Your routines are stored locally in an on-device SQLite database, providing fast startup and reliable data persistence.
            </p>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-3.5 border border-white/5 flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 mt-0.5 flex-shrink-0">
            <Smartphone size={18} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-white">Android Mobile Experience</h4>
            <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
              Optimized for portrait Android smartphones with smooth touch navigation and safe-area padding.
            </p>
          </div>
        </div>
      </div>

      {/* Legal & Documents Links */}
      <div className="space-y-3 mb-6">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider px-1">
          Legal &amp; Policy
        </h3>

        <div className="bg-surface rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          <button
            onClick={() => navigate('/privacy')}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-brand-purple/20 text-brand-accent">
                <Shield size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Privacy Policy</span>
            </div>
            <ExternalLink size={14} className="text-text-muted" />
          </button>

          <button
            onClick={() => navigate('/terms')}
            className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-brand-purple/20 text-brand-accent">
                <FileText size={16} />
              </div>
              <span className="text-xs font-semibold text-white">Terms &amp; Conditions</span>
            </div>
            <ExternalLink size={14} className="text-text-muted" />
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pt-2">
        <p className="text-[11px] text-text-muted">
          Support:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-accent hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[10px] text-text-muted/60 mt-1">
          Routine Planner • Designed for Android
        </p>
      </div>
    </div>
  );
};
