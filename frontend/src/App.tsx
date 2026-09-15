import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { CallProvider } from './context/CallContext';
import { GlobalCallOverlay } from './components/GlobalCallOverlay';
import { ThemeProvider } from './context/ThemeContext';
import { WifiOff } from 'lucide-react';

const Login = lazy(() => import('./pages/Login'));
const ProfileSelection = lazy(() => import('./pages/ProfileSelection'));
const Welcome = lazy(() => import('./pages/Welcome'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Session = lazy(() => import('./pages/Session'));
const GamePage = lazy(() => import('./pages/GamePage'));
const SessionComplete = lazy(() => import('./pages/SessionComplete'));
const CaregiverDashboard = lazy(() => import('./caregiver/Dashboard'));
const CaregiverTrends = lazy(() => import('./caregiver/Trends'));
const CaregiverInsights = lazy(() => import('./caregiver/Insights'));
const CaregiverFamiliarPeople = lazy(() => import('./caregiver/FamiliarPeople'));
const CaregiverReminders = lazy(() => import('./caregiver/Reminders'));
const CaregiverHistory = lazy(() => import('./caregiver/History'));
const CommunityHub = lazy(() => import('./pages/CommunityHub'));
const CommunitySessionRun = lazy(() => import('./pages/CommunitySessionRun'));
const ConnectHub = lazy(() => import('./pages/ConnectHub'));
const Methodology = lazy(() => import('./pages/Methodology'));
const Demo = lazy(() => import('./pages/Demo'));
const PersonalPatternExperience = lazy(() => import('./pages/PersonalPatternExperience'));
const OfficeKitView = lazy(() => import('./caregiver/OfficeKitView'));
const JudgeDemo = lazy(() => import('./pages/JudgeDemo'));

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
    return <Navigate to="/profiles" replace />;
  }
  return <>{children}</>;
};

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* Offline Status */}
      <OfflineBanner />

      {/* Global Real-Time Call Overlay & Incoming Ring Banner */}
      <GlobalCallOverlay />

      {/* Main Page Routing */}
      <main className="flex-grow flex flex-col">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Welcome />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/judge-demo" element={<JudgeDemo />} />
            <Route path="/personal-pattern" element={<PersonalPatternExperience />} />
            <Route path="/office-kit" element={<OfficeKitView />} />

            {/* Authenticated Caregiver Hub */}
            <Route path="/profiles" element={<ProtectedRoute><ProfileSelection /></ProtectedRoute>} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Profile Workspace Routes */}
            <Route path="/caregiver" element={<ProtectedRoute><CaregiverDashboard /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityHub /></ProtectedRoute>} />
            <Route path="/community/run" element={<ProtectedRoute><CommunitySessionRun /></ProtectedRoute>} />
            <Route path="/connect" element={<ProtectedRoute><ConnectHub /></ProtectedRoute>} />
            <Route path="/caregiver/trends" element={<ProtectedRoute><CaregiverTrends /></ProtectedRoute>} />
            <Route path="/caregiver/insights" element={<ProtectedRoute><CaregiverInsights /></ProtectedRoute>} />
            <Route path="/caregiver/people" element={<ProtectedRoute><CaregiverFamiliarPeople /></ProtectedRoute>} />
            <Route path="/caregiver/reminders" element={<ProtectedRoute><CaregiverReminders /></ProtectedRoute>} />
            <Route path="/caregiver/history" element={<ProtectedRoute><CaregiverHistory /></ProtectedRoute>} />

            {/* Parametric Profile Workspace Routes */}
            <Route path="/profiles/:profileId" element={<ProtectedRoute><CaregiverDashboard /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/overview" element={<ProtectedRoute><CaregiverDashboard /></ProtectedRoute>} />
                        {/* Cognitive Session Routes */}
            <Route path="/session" element={<ProtectedRoute><Session /></ProtectedRoute>} />
            <Route path="/session/:sessionId" element={<ProtectedRoute><Session /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/session" element={<ProtectedRoute><Session /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/session/:sessionId" element={<ProtectedRoute><Session /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/trends" element={<ProtectedRoute><CaregiverTrends /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/insights" element={<ProtectedRoute><CaregiverInsights /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/people" element={<ProtectedRoute><CaregiverFamiliarPeople /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/reminders" element={<ProtectedRoute><CaregiverReminders /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/history" element={<ProtectedRoute><CaregiverHistory /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/community" element={<ProtectedRoute><CommunityHub /></ProtectedRoute>} />
            <Route path="/profiles/:profileId/connect" element={<ProtectedRoute><ConnectHub /></ProtectedRoute>} />

            {/* Games routes */}
            <Route path="/games/:gameType" element={<ProtectedRoute><GamePage /></ProtectedRoute>} />
            <Route path="/session/complete" element={<ProtectedRoute><SessionComplete /></ProtectedRoute>} />

            {/* Catch-all fallback to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
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
        <AppProvider>
          <CallProvider>
            <AppContent />
          </CallProvider>
        </AppProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
