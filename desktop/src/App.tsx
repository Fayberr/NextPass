import { useEffect, useState } from 'react';
import { App as ExtensionApp } from '../../extension/src/popup/App';
import { TitleBar } from './components/TitleBar';
import { QuickSearchOverlay } from './components/QuickSearchOverlay';
import { DesktopAppShell } from './components/DesktopAppShell';

export default function App() {
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);

  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onQuickSearchToggle) {
      electronAPI.onQuickSearchToggle(() => {
        setIsQuickSearchOpen((prev) => !prev);
      });
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--pm-bg)] text-white/95 overflow-hidden select-none">
      {/* Integrated Frameless Window Header */}
      <TitleBar
        searchQuery=""
        onSearchChange={() => {}}
        onLockVault={() => {}}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        isUnlocked={false}
      />

      {/* Main Extension App Shell & Real Crypto Session Backend */}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        <ExtensionApp Shell={DesktopAppShell} />
      </main>

      {/* Global Quick Search Overlay (Ctrl+Alt+A) */}
      <QuickSearchOverlay
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        items={[]}
      />
    </div>
  );
}
