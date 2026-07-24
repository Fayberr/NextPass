/**
 * Desktop's own shell, swapped in via the `Shell` prop on the shared extension `App` component
 * (see extension/src/popup/App.tsx). Same screens/state/routing as the Chrome extension popup,
 * but a bigger, more spacious chrome around them: a labeled sidebar (icons + labels + count
 * badges) with Health/Settings pinned to the bottom, and a top bar with Sync living next to
 * Lock instead of behind a "more" menu.
 */

import type { AppShellProps } from '../../../extension/src/popup/AppShell.js';
import { DesktopSidebar } from './DesktopSidebar.js';
import { DesktopTopBar } from './DesktopTopBar.js';

export function DesktopAppShell({
  active,
  onSelectCategory,
  onGenerator,
  counts,
  search,
  onLock,
  onSync,
  syncing,
  onHealth,
  onSettings,
  healthAlert,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-full min-h-[560px]">
      <DesktopSidebar
        active={active}
        onSelect={onSelectCategory}
        onGenerator={onGenerator}
        onHealth={onHealth}
        onSettings={onSettings}
        counts={counts}
        healthAlert={healthAlert}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DesktopTopBar
          search={search}
          onLock={onLock}
          onSync={onSync}
          syncing={syncing}
        />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
