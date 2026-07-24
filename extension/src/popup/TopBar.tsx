/**
 * Persistent top bar: search (only meaningful on list screens), manual lock, and a "⋮" overflow
 * menu holding Sync / Password Health / Settings - Kaspersky keeps these behind a menu rather
 * than as permanent rail icons, and doing the same here keeps the rail limited to real item
 * categories.
 */

import { useEffect, useRef, useState } from 'react';
import { Button, Input } from './ui.js';
import { Lock, MoreVertical, RefreshCw, ShieldCheck, Settings as SettingsIcon, Upload } from './icons.js';

export function TopBar({
  search,
  onLock,
  onSync,
  syncing,
  onHealth,
  onSettings,
  onImport,
}: {
  search?: { value: string; onChange: (v: string) => void };
  onLock: () => void;
  onSync: () => void;
  syncing: boolean;
  onHealth: () => void;
  onSettings: () => void;
  onImport: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-2 border-b border-white/[0.07] p-3">
      {search ? (
        <Input
          placeholder="Search…"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
        />
      ) : (
        <div className="flex-1" />
      )}
      <Button variant="subtle" onClick={onLock} title="Lock">
        <Lock size={16} />
      </Button>
      <div ref={menuRef} className="relative">
        <Button variant="subtle" onClick={() => setMenuOpen((o) => !o)} title="More">
          <MoreVertical size={16} />
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-white/[0.07] bg-surface/95 p-1 shadow-glass backdrop-blur-xl">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onSync();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-white/80 hover:bg-white/10"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : undefined} /> Sync
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onHealth();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-white/80 hover:bg-white/10"
            >
              <ShieldCheck size={15} /> Password Health
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onSettings();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-white/80 hover:bg-white/10"
            >
              <SettingsIcon size={15} /> Settings
            </button>
            <div className="my-1 border-t border-white/[0.07]" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onImport();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-white/80 hover:bg-white/10"
            >
              <Upload size={15} /> Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
