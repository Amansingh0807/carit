import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute } from './components/PublicRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Activities } from './pages/Activities';
import { Recommendations } from './pages/Recommendations';
import { Achievements } from './pages/Achievements';
import { Landing } from './pages/Landing';
import { useAuthStore } from './store/useAuthStore';

const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();

    // Listen to session expired events to clear session & redirect
    const handleSessionExpired = () => {
      window.location.href = '/login';
    };
    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes (Not Auth Only) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Routes (Auth Only) */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/activities"
            element={
              <Layout>
                <Activities />
              </Layout>
            }
          />
          <Route
            path="/recommendations"
            element={
              <Layout>
                <Recommendations />
              </Layout>
            }
          />
          <Route
            path="/achievements"
            element={
              <Layout>
                <Achievements />
              </Layout>
            }
          />
        </Route>

        {/* Fallbacks */}
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
