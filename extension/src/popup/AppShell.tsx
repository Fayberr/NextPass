/** Persistent Kaspersky-style shell: icon rail + top bar wrapping whatever screen is active. */

import type { ReactNode } from 'react';
import { Sidebar, type Category } from './Sidebar.js';
import { TopBar } from './TopBar.js';

export interface AppShellProps {
  active: Category | 'generator' | 'health' | 'settings';
  onSelectCategory: (c: Category) => void;
  onGenerator: () => void;
  /** Per-category item counts for shells that render count badges (desktop's labeled
   *  sidebar); the popup's narrow icon rail has no room for them and ignores this. */
  counts?: Partial<Record<Category, number>>;
  search?: { value: string; onChange: (v: string) => void };
  onLock: () => void;
  onSync: () => void;
  syncing: boolean;
  onHealth: () => void;
  onSettings: () => void;
  onImport: () => void;
  children: ReactNode;
}

export function AppShell({
  active,
  onSelectCategory,
  onGenerator,
  search,
  onLock,
  onSync,
  syncing,
  onHealth,
  onSettings,
  onImport,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-full min-h-[560px]">
      <Sidebar active={active} onSelect={onSelectCategory} onGenerator={onGenerator} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          search={search}
          onLock={onLock}
          onSync={onSync}
          syncing={syncing}
          onHealth={onHealth}
          onSettings={onSettings}
          onImport={onImport}
        />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
