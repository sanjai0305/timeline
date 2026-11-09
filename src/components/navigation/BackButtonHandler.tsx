import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { backButtonService } from '@/services/backButtonService';

export const BackButtonHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    backButtonService.setNavigate(navigate);
    backButtonService.trackPath(location.pathname);
  }, [navigate, location.pathname]);

  useEffect(() => {
    const cleanup = backButtonService.init();
    return () => {
      cleanup();
    };
  }, []);

  return null;
};

