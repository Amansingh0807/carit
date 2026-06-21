import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-carbon-950 flex items-center justify-center" role="status" aria-label="Loading authentication details">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner border-primary-500 border-t-transparent animate-spin rounded-full border-4 w-12 h-12"></div>
          <p className="text-carbon-400 font-medium animate-pulse">Initializing...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};
