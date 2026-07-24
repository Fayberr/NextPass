/**
 * Desktop-only top bar: search + Lock + Sync sit side by side as permanent buttons. Unlike the
 * extension popup's TopBar, there is no "⋮" overflow menu here - Password Health and Settings
 * moved to the bottom of the rail (see DesktopSidebar.tsx) since the desktop window has plenty
 * of room for them as first-class navigation targets instead of hiding them behind a menu.
 */

import { Button, Input } from '../../../extension/src/popup/ui.js';
import { Lock, RefreshCw, Upload } from '../../../extension/src/popup/icons.js';

export function DesktopTopBar({
  search,
  onLock,
  onSync,
  syncing,
  onImport,
}: {
  search?: { value: string; onChange: (v: string) => void };
  onLock: () => void;
  onSync: () => void;
  syncing: boolean;
  onImport: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[rgba(255,255,255,0.07)] p-4">
      {search ? (
        <Input
          placeholder="Search…"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
        />
      ) : (
        <div className="flex-1" />
      )}
      <Button variant="subtle" onClick={onImport} title="Import passwords">
        <Upload size={17} />
      </Button>
      <Button variant="subtle" onClick={onSync} title="Sync">
        <RefreshCw size={17} className={syncing ? 'animate-spin' : undefined} />
      </Button>
      <Button variant="subtle" onClick={onLock} title="Lock">
        <Lock size={17} />
      </Button>
    </div>
  );
}
