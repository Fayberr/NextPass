import { useState } from 'react';
import { Search, Lock, ShieldCheck, Minus, Square, X, Sparkles } from './icons';

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLockVault: () => void;
  onOpenQuickSearch: () => void;
  isUnlocked: boolean;
}

export function TitleBar({
  searchQuery,
  onSearchChange,
  onLockVault,
  onOpenQuickSearch,
  isUnlocked,
}: TitleBarProps) {
  const electronAPI = (window as any).electronAPI;

  return (
    <header className="app-drag h-12 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-50 select-none">
      {/* Brand & App Title */}
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
          NextPass <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">Desktop</span>
        </span>
      </div>

      {/* Center Integrated Search Bar */}
      {isUnlocked && (
        <div className="app-no-drag flex-1 max-w-md mx-6">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search vault items (Ctrl+F)..."
              className="w-full bg-zinc-900/90 hover:bg-zinc-900 focus:bg-zinc-900 text-xs text-zinc-100 placeholder-zinc-500 rounded-lg pl-9 pr-16 py-1.5 border border-white/10 focus:border-brand-500 focus:outline-none transition-colors"
            />
            <button
              onClick={onOpenQuickSearch}
              className="absolute right-2 px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded border border-white/10 flex items-center gap-1 transition-colors"
              title="Open Spotlight Quick HUD (Ctrl+Alt+A)"
            >
              <Sparkles className="h-2.5 w-2.5 text-brand-400" />
              <span>HUD</span>
            </button>
          </div>
        </div>
      )}

      {/* Right Controls */}
      <div className="app-no-drag flex items-center gap-2">
        {isUnlocked && (
          <button
            onClick={onLockVault}
            className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
            title="Lock Vault"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        {/* Window controls */}
        <button
          onClick={() => electronAPI?.minimizeWindow?.()}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => electronAPI?.maximizeWindow?.()}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          onClick={() => electronAPI?.closeWindow?.()}
          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
