import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DashboardLayout } from './components/DashboardLayout';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { DeliverablesPage } from './pages/DeliverablesPage';
import { BillingPage } from './pages/BillingPage';
import { ClientPortalPage } from './pages/ClientPortalPage';
import { TeamPage } from './pages/TeamPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { NotFoundPage } from './pages/NotFoundPage';

import { Toaster } from 'react-hot-toast';
import { CookieConsent } from './components/CookieConsent';
import { ThemeProvider } from './contexts/ThemeContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '6px',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              boxShadow: 'var(--shadow-dropdown)',
            },
          }}
        />
        <CookieConsent />
        <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/portal" element={<ClientPortalPage />} />
          <Route path="/invite/:token" element={<AcceptInvitePage />} />

          {/* Protected Agency Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="deliverables" element={<DeliverablesPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="billing" element={<BillingPage />} />
          </Route>

          {/* 404 Not Found Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
