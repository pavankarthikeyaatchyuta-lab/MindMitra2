import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { mode: ThemeMode; label: string; icon: React.ElementType; colorClass: string }[] = [
    { mode: 'light', label: 'Light', icon: Sun, colorClass: 'text-amber-500' },
    { mode: 'system', label: 'System', icon: Monitor, colorClass: 'text-slate-500 dark:text-slate-400' },
    { mode: 'dark', label: 'Dark', icon: Moon, colorClass: 'text-blue-500 dark:text-blue-400' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {options.map(opt => {
        const Icon = opt.icon;
        const isSelected = theme === opt.mode;
        return (
          <button
            key={opt.mode}
            onClick={() => setTheme(opt.mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              isSelected
                ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white border border-transparent'
            }`}
            title={`Set ${opt.label} theme`}
          >
            <Icon size={14} className={opt.colorClass} />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
