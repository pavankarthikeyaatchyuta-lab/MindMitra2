import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { CallProvider } from './context/CallContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './i18n';
import { WifiOff } from 'lucide-react';

// Public Pages
const Welcome = lazy(() => import('./pages/Welcome'));
const Login = lazy(() => import('./pages/Login'));

// Normal User Pages (Elder-First Responsive)
const UserHome = lazy(() => import('./pages/UserHome'));
const ActivitiesList = lazy(() => import('./pages/ActivitiesList'));
const GamePage = lazy(() => import('./pages/GamePage'));
const SessionResult = lazy(() => import('./pages/SessionResult'));
const MyPattern = lazy(() => import('./pages/MyPattern'));
const UserProfile = lazy(() => import('./pages/UserProfile'));

// Caregiver Workspace Pages
const CaregiverOverview = lazy(() => import('./caregiver/CaregiverOverview'));
const CaregiverIndividualSelector = lazy(() => import('./caregiver/CaregiverIndividualSelector'));
const CaregiverPersonDetail = lazy(() => import('./caregiver/CaregiverPersonDetail'));
const CaregiverPersonPattern = lazy(() => import('./caregiver/CaregiverPersonPattern'));
const OfficeKitView = lazy(() => import('./caregiver/OfficeKitView'));

const OfflineBanner = () => {
  const { isOnline } = useAppContext();
  if (isOnline) return null;
  return (
    <div className="bg-amber-600 text-white p-3 text-center flex items-center justify-center gap-2 sticky top-0 z-50 text-sm font-semibold shadow">
      <WifiOff size={18} />
      <span>Offline Mode Active — Telemetry & gameplay saved locally</span>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="flex-grow flex flex-col items-center justify-center p-8 gap-4 min-h-[50vh]">
    <div className="w-10 h-10 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading MindMitra...</span>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { caregiver } = useAppContext();
  if (!caregiver) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { caregiver } = useAppContext();
  if (caregiver) {
    return <Navigate to="/home" replace />;
  }
  return <>{children}</>;
};

function AppContent() {
  const { caregiver } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Offline Status */}
      <OfflineBanner />

      {/* Main Page Routing */}
      <main className="flex-grow flex flex-col">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* ============================================================
                PUBLIC ROUTES
               ============================================================ */}
            <Route path="/" element={<Welcome />} />
            <Route path="/landing" element={<Welcome />} />
            <Route path="/login" element={<PublicOnlyRoute><Login initialRegister={false} /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Login initialRegister={true} /></PublicOnlyRoute>} />
            <Route path="/signup" element={<Navigate to="/register" replace />} />

            {/* ============================================================
                NORMAL USER ROUTES (Phone-First)
               ============================================================ */}
            <Route path="/home" element={<ProtectedRoute><UserHome /></ProtectedRoute>} />
            <Route path="/activities" element={<ProtectedRoute><ActivitiesList /></ProtectedRoute>} />
            <Route path="/activity/:id" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
            <Route path="/session-result/:id" element={<ProtectedRoute><SessionResult /></ProtectedRoute>} />
            <Route path="/my-pattern" element={<ProtectedRoute><MyPattern /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

            {/* Games Route Backwards-Compatibility */}
            <Route path="/games/:gameType" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />

            {/* ============================================================
                CAREGIVER ROUTES
               ============================================================ */}
            <Route path="/caregiver" element={<ProtectedRoute><CaregiverOverview /></ProtectedRoute>} />
            <Route path="/caregiver/individuals" element={<ProtectedRoute><CaregiverIndividualSelector /></ProtectedRoute>} />
            <Route path="/caregiver/person/:id" element={<ProtectedRoute><CaregiverPersonDetail /></ProtectedRoute>} />
            <Route path="/caregiver/person/:id/pattern" element={<ProtectedRoute><CaregiverPersonPattern /></ProtectedRoute>} />
            <Route path="/caregiver/office-kit" element={<ProtectedRoute><OfficeKitView /></ProtectedRoute>} />

            {/* ============================================================
                LEGACY ROUTE REDIRECTS (Consolidated into strict IA)
               ============================================================ */}
            <Route path="/session" element={<Navigate to="/activities" replace />} />
            <Route path="/session/complete" element={<Navigate to="/my-pattern" replace />} />
            <Route path="/personal-pattern" element={<Navigate to="/my-pattern" replace />} />
            <Route path="/profiles" element={<Navigate to="/caregiver/individuals" replace />} />
            <Route path="/profiles/:profileId" element={<Navigate to="/caregiver/person/:profileId" replace />} />
            <Route path="/profiles/:profileId/overview" element={<Navigate to="/caregiver/person/:profileId" replace />} />
            <Route path="/profiles/:profileId/trends" element={<Navigate to="/caregiver/person/:profileId/pattern" replace />} />
            <Route path="/profiles/:profileId/insights" element={<Navigate to="/caregiver/person/:profileId/pattern" replace />} />
            <Route path="/profiles/:profileId/people" element={<Navigate to="/caregiver/person/:profileId" replace />} />
            <Route path="/profiles/:profileId/reminders" element={<Navigate to="/caregiver/person/:profileId" replace />} />
            <Route path="/profiles/:profileId/history" element={<Navigate to="/caregiver/person/:profileId/pattern" replace />} />
            <Route path="/caregiver/trends" element={<Navigate to="/caregiver" replace />} />
            <Route path="/caregiver/insights" element={<Navigate to="/caregiver" replace />} />
            <Route path="/caregiver/people" element={<Navigate to="/caregiver" replace />} />
            <Route path="/caregiver/reminders" element={<Navigate to="/caregiver" replace />} />
            <Route path="/caregiver/history" element={<Navigate to="/caregiver" replace />} />
            <Route path="/office-kit" element={<Navigate to="/caregiver/office-kit" replace />} />
            <Route path="/community" element={<Navigate to="/home" replace />} />
            <Route path="/connect" element={<Navigate to="/home" replace />} />
            <Route path="/how-it-works" element={<Navigate to="/landing" replace />} />
            <Route path="/methodology" element={<Navigate to="/landing" replace />} />
            <Route path="/judge-demo" element={<Navigate to="/home" replace />} />
            <Route path="/demo" element={<Navigate to="/home" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to={caregiver ? "/home" : "/landing"} replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AppProvider>
            <CallProvider>
              <AppContent />
            </CallProvider>
          </AppProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
