import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AppRouter } from './router';
import { BottomNav } from '@/components/navigation/BottomNav';
import { BackButtonHandler } from '@/components/navigation/BackButtonHandler';
import { ActiveAlarmModal } from '@/components/routine/ActiveAlarmModal';
import { ResetPasswordModal } from '@/components/auth/ResetPasswordModal';
import { useRoutineStore } from '@/store/routineStore';
import { useAuthStore } from '@/store/authStore';
import { getRoutineRepository } from '@/database';
import { notificationService } from '@/services/notificationService';

export const App: React.FC = () => {
  const { fetchRoutines } = useRoutineStore();
  const { initAuth } = useAuthStore();
  const [resetActionCode, setResetActionCode] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initialize Firebase Auth State Listener
    const unsubAuth = initAuth();

    // 2. Deep Link & App Link handling for Firebase Password Reset
    const extractActionCode = (urlString: string): string | null => {
      try {
        const url = new URL(urlString);
        const mode = url.searchParams.get('mode');
        const oobCode = url.searchParams.get('oobCode');
        if (oobCode && (mode === 'resetPassword' || !mode)) {
          return oobCode;
        }
      } catch {
        const match = urlString.match(/[?&]oobCode=([^&]+)/);
        if (match && match[1]) {
          return decodeURIComponent(match[1]);
        }
      }
      return null;
    };

    const handleIncomingUrl = (url: string) => {
      const code = extractActionCode(url);
      if (code) {
        setResetActionCode(code);
      }
    };

    // Check initial browser URL (web)
    if (typeof window !== 'undefined' && window.location.search) {
      handleIncomingUrl(window.location.href);
    }

    // Check native launch URL (Android cold start)
    CapacitorApp.getLaunchUrl().then((res) => {
      if (res?.url) {
        handleIncomingUrl(res.url);
      }
    });

    // Listen for appUrlOpen (Android warm start / deep link)
    const urlSubPromise = CapacitorApp.addListener('appUrlOpen', (event) => {
      if (event?.url) {
        handleIncomingUrl(event.url);
      }
    });

    // 3. Initialize Database, Notifications & Routines
    const initializeApp = async () => {
      try {
        await getRoutineRepository();
        await notificationService.init();
        await fetchRoutines();
      } catch (err) {
        console.error('Database initialization failed:', err);
      }

      // Capacitor Native adjustments
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#0D0D1B' });
          await SplashScreen.hide();
        } catch (e) {
          console.warn('Native statusbar or splashscreen plugin error:', e);
        }
      }
    };

    initializeApp();

    return () => {
      unsubAuth();
      urlSubPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [fetchRoutines, initAuth]);

  return (
    <BrowserRouter>
      <BackButtonHandler />
      <ActiveAlarmModal />
      {resetActionCode && (
        <ResetPasswordModal
          isOpen={Boolean(resetActionCode)}
          oobCode={resetActionCode}
          onClose={() => setResetActionCode(null)}
          onSuccess={() => {
            setResetActionCode(null);
          }}
        />
      )}
      <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans select-none antialiased">
        <main className="flex-1 overflow-y-auto">
          <AppRouter />
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
};

export default App;
