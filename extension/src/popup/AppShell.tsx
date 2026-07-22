/** Persistent Kaspersky-style shell: icon rail + top bar wrapping whatever screen is active. */

import type { ReactNode } from 'react';
import { Sidebar, type Category } from './Sidebar.js';
import { TopBar } from './TopBar.js';

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
}: {
  active: Category | 'generator';
  onSelectCategory: (c: Category) => void;
  onGenerator: () => void;
  search?: { value: string; onChange: (v: string) => void };
  onLock: () => void;
  onSync: () => void;
  syncing: boolean;
  onHealth: () => void;
  onSettings: () => void;
  onImport: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-[560px]">
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
