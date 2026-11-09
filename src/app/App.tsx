import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { AppRouter } from './router';
import { BottomNav } from '@/components/navigation/BottomNav';
import { BackButtonHandler } from '@/components/navigation/BackButtonHandler';
import { useRoutineStore } from '@/store/routineStore';
import { useAuthStore } from '@/store/authStore';
import { getRoutineRepository } from '@/database';
import { notificationService } from '@/services/notificationService';

export const App: React.FC = () => {
  const { fetchRoutines } = useRoutineStore();
  const { initAuth } = useAuthStore();

  useEffect(() => {
    // 1. Initialize Firebase Auth State Listener
    const unsubAuth = initAuth();

    // 2. Initialize Database, Notifications & Routines
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
    };
  }, [fetchRoutines, initAuth]);

  return (
    <BrowserRouter>
      <BackButtonHandler />
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
