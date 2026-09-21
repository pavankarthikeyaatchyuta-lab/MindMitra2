import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Gamepad2, 
  Activity, 
  User, 
  Users, 
  Laptop, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Brain
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ThemeToggle from '../ThemeToggle';

interface AppLayoutProps {
  children: React.ReactNode;
  mode?: 'user' | 'caregiver';
}

export default function AppLayout({ children, mode = 'user' }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { caregiver, currentUser, logout } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Determine active route
  const path = location.pathname;

  // Normal user bottom navigation items (Phone)
  const userNavItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Activities', path: '/activities', icon: Gamepad2 },
    { label: 'My Pattern', path: '/my-pattern', icon: Activity },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  // Caregiver navigation items (Desktop / Tablet)
  const caregiverNavItems = [
    { label: 'Overview', path: '/caregiver', icon: Users },
    { label: 'Office Kit', path: '/caregiver/office-kit', icon: Laptop },
    { label: 'Individual View', path: '/home', icon: Home },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* 1. TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to={mode === 'caregiver' ? '/caregiver' : '/home'} className="flex items-center gap-2.5 group touch-target-48">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors shrink-0">
              <Brain size={22} />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                MindMitra
                {mode === 'caregiver' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Caregiver
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Personal Behavioral Memory
              </span>
            </div>
          </Link>

          {/* User Presence & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser && mode === 'user' && (
              <Link 
                to="/profile" 
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{currentUser.name || currentUser.display_name}</span>
              </Link>
            )}

            {caregiver && (
              <div className="hidden lg:flex items-center gap-1.5">
                {mode === 'user' ? (
                  <Link
                    to="/caregiver"
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all"
                  >
                    Switch to Caregiver Portal
                  </Link>
                ) : (
                  <Link
                    to="/home"
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-all"
                  >
                    View as Individual
                  </Link>
                )}
              </div>
            )}

            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="touch-target-48 p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN BODY WRAPPER */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* DESKTOP SIDEBAR (>=1024px) for Caregiver Mode */}
        {mode === 'caregiver' && (
          <aside className={`hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 p-4 transition-all duration-200 shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>

            <nav className="flex flex-col gap-1.5 flex-1">
              {caregiverNavItems.map(item => {
                const isActive = path === item.path || (item.path !== '/caregiver' && path.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>

            {!sidebarCollapsed && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold mb-1">
                  <ShieldCheck size={14} className="text-blue-500" />
                  <span>Caregiver Workspace</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Logged in as {caregiver?.name || 'Caregiver'}
                </p>
              </div>
            )}
          </aside>
        )}

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* 3. PHONE / TABLET BOTTOM NAVIGATION BAR */}
      {mode === 'user' ? (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex justify-around items-center shadow-lg transition-colors">
          {userNavItems.map(item => {
            const isActive = path === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 touch-target-48 rounded-xl transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-black'
                    : 'text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={22} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex justify-around items-center shadow-lg transition-colors">
          {caregiverNavItems.map(item => {
            const isActive = path === item.path || (item.path !== '/caregiver' && path.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 touch-target-48 rounded-xl transition-all ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-black'
                    : 'text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={22} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
