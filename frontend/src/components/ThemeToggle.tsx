import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div 
      className="inline-flex items-center p-1 bg-slate-200/90 dark:bg-slate-800/90 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs"
      role="radiogroup"
      aria-label="Theme selection"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer min-h-[36px] ${
          theme === 'light'
            ? 'bg-white text-amber-700 shadow-xs border border-slate-300 ring-1 ring-amber-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Switch to Light Theme"
      >
        <Sun size={15} className={theme === 'light' ? 'text-amber-600 fill-amber-500/30' : 'text-slate-500'} />
        <span>Light</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer min-h-[36px] ${
          theme === 'dark'
            ? 'bg-slate-900 text-blue-300 shadow-xs border border-slate-700 ring-1 ring-blue-500/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Switch to Dark Theme"
      >
        <Moon size={15} className={theme === 'dark' ? 'text-blue-400 fill-blue-500/30' : 'text-slate-500'} />
        <span>Dark</span>
      </button>
    </div>
  );
}
