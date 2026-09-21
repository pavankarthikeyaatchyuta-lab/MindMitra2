import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Gamepad2, 
  Activity, 
  User, 
  Users, 
  Laptop, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Brain,
  ArrowRightLeft
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

  const path = location.pathname;

  // Individual user navigation items
  const userNavItems = [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Activities', path: '/activities', icon: Gamepad2 },
    { label: 'My Pattern', path: '/my-pattern', icon: Activity },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  // Caregiver navigation items
  const caregiverNavItems = [
    { label: 'Overview', path: '/caregiver', icon: Users },
    { label: 'Office Kit', path: '/caregiver/office-kit', icon: Laptop },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-150">
      {/* 1. TOP HEADER (Simplified, no duplicate nav links) */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-800 px-4 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to={mode === 'caregiver' ? '/caregiver' : '/home'} className="flex items-center gap-2.5 group min-h-[44px]">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors shrink-0">
              <Brain size={20} />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                MindMitra
                {mode === 'caregiver' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Caregiver
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Individual
                  </span>
                )}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Personal Behavioral Memory
              </span>
            </div>
          </Link>

          {/* Current Profile / Role Indicator & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser && mode === 'user' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate max-w-[140px]">{currentUser.name || currentUser.display_name}</span>
              </div>
            )}

            {caregiver && mode === 'caregiver' && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span className="truncate max-w-[140px]">{caregiver.name}</span>
              </div>
            )}

            {/* Light / Dark Theme Toggle */}
            <ThemeToggle />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 min-h-[44px] min-w-[44px] rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-colors flex items-center justify-center cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN BODY WRAPPER (Persistent Left Sidebar for Desktop/Tablet) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* ============================================================
            PERSISTENT VERTICAL LEFT SIDEBAR (Desktop & Tablet: md+)
            Consistent across both Individual and Caregiver modes
           ============================================================ */}
        <aside 
          className={`hidden md:flex flex-col border-r border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 transition-all duration-200 shrink-0 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
          aria-label={mode === 'caregiver' ? 'Caregiver Navigation' : 'Individual Navigation'}
        >
          {/* Sidebar Header & Collapse Toggle */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            {!sidebarCollapsed ? (
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {mode === 'caregiver' ? 'Caregiver Portal' : 'MindMitra'}
                </div>
                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                  Personal Behavioral Memory
                </div>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white mx-auto">
                <Brain size={16} />
              </div>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label="Toggle sidebar collapse"
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Primary Sidebar Navigation Items */}
          <nav className="flex flex-col gap-1.5 flex-1" role="navigation">
            {mode === 'user' ? (
              // Individual User Sidebar Items
              userNavItems.map(item => {
                const isActive = path === item.path || (item.path !== '/home' && path.startsWith(item.path));
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
                    title={item.label}
                  >
                    <Icon size={20} className="shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })
            ) : (
              // Caregiver Workspace Sidebar Items
              caregiverNavItems.map(item => {
                const isActive = path === item.path || (item.path !== '/caregiver' && path.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={item.label}
                  >
                    <Icon size={20} className="shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })
            )}
          </nav>

          {/* Sidebar Footer: Mode Switcher */}
          <div className="pt-3 mt-auto border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            {mode === 'user' ? (
              <Link
                to="/caregiver"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 transition-all ${
                  sidebarCollapsed ? 'justify-center' : ''
                }`}
                title="Switch to Caregiver Portal"
              >
                <ArrowRightLeft size={16} className="shrink-0" />
                {!sidebarCollapsed && <span>Switch to Caregiver</span>}
              </Link>
            ) : (
              <Link
                to="/home"
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/70 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 transition-all ${
                  sidebarCollapsed ? 'justify-center' : ''
                }`}
                title="View as Individual"
              >
                <ArrowRightLeft size={16} className="shrink-0" />
                {!sidebarCollapsed && <span>View as Individual</span>}
              </Link>
            )}

            {!sidebarCollapsed && (
              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400">
                {mode === 'caregiver' ? (
                  <span>Caregiver Workspace • {caregiver?.name || 'Caregiver'}</span>
                ) : (
                  <span>Active Profile • {currentUser?.name || currentUser?.display_name || 'Individual'}</span>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* ============================================================
          3. PHONE BOTTOM NAVIGATION (< 768px ONLY)
          Large touch targets (minimum 48x48px), thumb-friendly
         ============================================================ */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-300 dark:border-slate-800 px-2 py-1 flex justify-around items-center shadow-lg transition-colors"
        aria-label="Mobile Bottom Navigation"
      >
        {mode === 'user' ? (
          userNavItems.map(item => {
            const isActive = path === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] min-w-[48px] rounded-xl transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-black'
                    : 'text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={22} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })
        ) : (
          caregiverNavItems.concat([{ label: 'Individual', path: '/home', icon: Home }]).map(item => {
            const isActive = path === item.path || (item.path !== '/caregiver' && path.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] min-w-[48px] rounded-xl transition-all ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-black'
                    : 'text-slate-600 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={22} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
                <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })
        )}
      </nav>
    </div>
  );
}
