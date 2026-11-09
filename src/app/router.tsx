import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomeScreen } from '@/features/home/HomeScreen';
import { MyRoutinesScreen } from '@/features/routines/MyRoutinesScreen';
import { CreateRoutineScreen } from '@/features/create-routine/CreateRoutineScreen';
import { RoutineDetailsScreen } from '@/features/routine-details/RoutineDetailsScreen';
import { CalendarScreen } from '@/features/calendar/CalendarScreen';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { PrivacyPolicyScreen } from '@/features/legal/PrivacyPolicyScreen';
import { TermsConditionsScreen } from '@/features/legal/TermsConditionsScreen';
import { AboutScreen } from '@/features/legal/AboutScreen';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/routines" element={<MyRoutinesScreen />} />
      <Route path="/routines/:id" element={<RoutineDetailsScreen />} />
      <Route path="/create" element={<CreateRoutineScreen />} />
      <Route path="/routines/:id/edit" element={<CreateRoutineScreen />} />
      <Route path="/calendar" element={<CalendarScreen />} />
      <Route path="/profile" element={<ProfileScreen />} />
      <Route path="/privacy" element={<PrivacyPolicyScreen />} />
      <Route path="/terms" element={<TermsConditionsScreen />} />
      <Route path="/about" element={<AboutScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

