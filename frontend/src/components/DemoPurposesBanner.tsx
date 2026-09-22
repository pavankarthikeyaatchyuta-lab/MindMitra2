import React from 'react';

/**
 * TEMPORARY COMPONENT: "This is for demo purposes"
 * To be deleted when requested by user.
 */
export const SHOW_DEMO_PURPOSES_NOTICE = true;

export function DemoPurposesTopBanner() {
  if (!SHOW_DEMO_PURPOSES_NOTICE) return null;
  return (
    <div 
      data-testid="demo-purposes-banner"
      className="w-full bg-amber-500/10 dark:bg-amber-400/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 select-none z-50 transition-colors"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span>This is for demo purposes</span>
    </div>
  );
}

export function DemoPurposesFooterNotice() {
  if (!SHOW_DEMO_PURPOSES_NOTICE) return null;
  return (
    <div 
      data-testid="demo-purposes-footer"
      className="w-full py-2.5 text-center text-xs font-semibold text-amber-700/90 dark:text-amber-400/90 select-none"
    >
      <span>This is for demo purposes</span>
    </div>
  );
}
