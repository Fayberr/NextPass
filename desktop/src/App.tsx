import { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar, CategoryId } from './components/Sidebar';
import { VaultGrid, VaultItem } from './components/VaultGrid';
import { AuthenticatorView, TotpItem } from './components/AuthenticatorView';
import { PasskeyHubView, PasskeyItem } from './components/PasskeyHubView';
import { HealthDashboardView } from './components/HealthDashboardView';
import { GeneratorView } from './components/GeneratorView';
import { SettingsView } from './components/SettingsView';
import { QuickSearchOverlay } from './components/QuickSearchOverlay';
import { LockScreen } from './components/LockScreen';
import { Plus, X } from './components/icons';

// Pre-seeded vault items inspired by user screenshots
const INITIAL_ITEMS: VaultItem[] = [
  {
    id: '1',
    title: '152.53.20.52',
    type: 'login',
    url: '152.53.20.52',
    username: 'fayber',
    password: 'SuperSecretPassword123!',
    securityStatus: 'strong',
    updatedAt: '2026-07-23',
  },
  {
    id: '2',
    title: 'Ai Fayber',
    type: 'login',
    url: 'https://ai.fayber.dev',
    username: 'fabian.kolb2009@gmail.com',
    password: 'StrongPassphrase2026!',
    securityStatus: 'strong',
    updatedAt: '2026-07-23',
  },
  {
    id: '3',
    title: 'Amazon.de',
    type: 'login',
    url: 'https://amazon.de',
    username: 'fabian.kolb2009@gmail.com',
    password: 'password123',
    securityStatus: 'weak',
    updatedAt: '2026-07-23',
  },
  {
    id: '4',
    title: 'Account Termius',
    type: 'login',
    url: 'https://account.termius.com',
    username: 'fabian.kolb2009@gmail.com',
    password: 'PwnedPassword2024',
    securityStatus: 'compromised',
    updatedAt: '2026-07-23',
  },
  {
    id: '5',
    title: 'Discord',
    type: 'login',
    url: 'https://discord.com',
    username: 'fayber',
    password: 'DiscordSecurePass99',
    securityStatus: 'reused',
    updatedAt: '2026-07-23',
  },
  {
    id: '6',
    title: 'Meine Bankkarte',
    type: 'card',
    cardNumber: '4165999988883310',
    cardExp: '05/30',
    cardName: 'Michaela Kolb',
    cardCvc: '321',
    securityStatus: 'strong',
    updatedAt: '2026-07-23',
  },
];

const INITIAL_TOTP: TotpItem[] = [
  { id: 't1', title: 'Discord', secret: 'JBSWY3DPEHPK3PXP', issuer: 'Discord Inc.' },
  { id: 't2', title: 'GitHub (XyferCry)', secret: 'K4XW653EO47TG6LE', issuer: 'GitHub' },
  { id: 't3', title: 'Google Account', secret: 'MZXW6YTBOI======', issuer: 'Google' },
  { id: 't4', title: 'Hack The Box', secret: 'N45W6YTBOI======', issuer: 'HackTheBox' },
];

const INITIAL_PASSKEYS: PasskeyItem[] = [
  { id: 'p1', title: 'GitHub', rpId: 'github.com', userName: 'XyferCry', createdAt: '2026-07-15' },
  { id: 'p2', title: 'Google', rpId: 'google.com', userName: 'fabian.kolb2009@gmail.com', createdAt: '2026-07-18' },
  { id: 'p3', title: 'Microsoft', rpId: 'login.microsoft.com', userName: 'derfayber@outlook.com', createdAt: '2026-07-20' },
  { id: 'p4', title: 'Amazon', rpId: 'amazon.de', userName: 'faybersecond@gmail.com', createdAt: '2026-07-22' },
];

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const [items, setItems] = useState<VaultItem[]>(INITIAL_ITEMS);
  const [totpItems, setTotpItems] = useState<TotpItem[]>(INITIAL_TOTP);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>(INITIAL_PASSKEYS);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Setup electron API hotkey listener
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onQuickSearchToggle) {
      electronAPI.onQuickSearchToggle(() => {
        setIsQuickSearchOpen((prev) => !prev);
      });
    }
  }, []);

  const counts = {
    all: items.length,
    login: items.filter((i) => i.type === 'login').length,
    card: items.filter((i) => i.type === 'card').length,
    passkey: passkeys.length,
    totp: totpItems.length,
    secret: items.filter((i) => i.type === 'secret').length,
  };

  const filteredItems = items.filter((item) => {
    // Category filter
    if (activeCategory === 'login' && item.type !== 'login') return false;
    if (activeCategory === 'card' && item.type !== 'card') return false;
    if (activeCategory === 'secret' && item.type !== 'secret') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.url && item.url.toLowerCase().includes(q)) ||
        (item.username && item.username.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: VaultItem = {
      id: Date.now().toString(),
      title: newTitle,
      type: 'login',
      url: newUrl,
      username: newUsername,
      password: newPassword,
      securityStatus: 'strong',
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setItems((prev) => [newItem, ...prev]);
    setNewTitle('');
    setNewUrl('');
    setNewUsername('');
    setNewPassword('');
    setIsAddModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (!isUnlocked) {
    return (
      <div className="h-screen w-screen flex flex-col bg-zinc-950">
        <TitleBar
          searchQuery=""
          onSearchChange={() => {}}
          onLockVault={() => {}}
          onOpenQuickSearch={() => {}}
          isUnlocked={false}
        />
        <LockScreen
          onUnlock={() => setIsUnlocked(true)}
          onWindowsHelloUnlock={() => setIsUnlocked(true)}
        />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Title Bar */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLockVault={() => setIsUnlocked(false)}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        isUnlocked={true}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          counts={counts}
        />

        {/* Dynamic Content View */}
        {activeCategory === 'totp' ? (
          <AuthenticatorView items={totpItems} onAddTotp={() => setIsAddModalOpen(true)} />
        ) : activeCategory === 'passkey' ? (
          <PasskeyHubView passkeys={passkeys} />
        ) : activeCategory === 'health' ? (
          <HealthDashboardView
            compromisedCount={items.filter((i) => i.securityStatus === 'compromised').length || 18}
            weakCount={items.filter((i) => i.securityStatus === 'weak').length || 39}
            reusedCount={items.filter((i) => i.securityStatus === 'reused').length || 37}
            strongCount={items.filter((i) => i.securityStatus === 'strong').length || 105}
            totalCount={items.length}
            onFixIssue={() => setActiveCategory('all')}
          />
        ) : activeCategory === 'generator' ? (
          <GeneratorView />
        ) : activeCategory === 'settings' ? (
          <SettingsView />
        ) : (
          <VaultGrid
            items={filteredItems}
            onSelectItem={() => {}}
            onAddItem={() => setIsAddModalOpen(true)}
            onEditItem={() => {}}
            onDeleteItem={handleDeleteItem}
          />
        )}
      </div>

      {/* Global Quick Search HUD Overlay (Ctrl+Alt+A) */}
      <QuickSearchOverlay
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        items={items}
      />

      {/* Add New Item Modal */}
      {isAddModalOpen && (
        <div
          onClick={() => setIsAddModalOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-brand-400" />
                <span>Neues Konto Hinzufügen</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase">Titel / Service</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="z.B. GitHub, Google, Fayber Server"
                  className="w-full mt-1 bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3 py-2 border border-white/10 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase">Webadresse (URL)</label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full mt-1 bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3 py-2 border border-white/10 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase">Benutzername / E-Mail</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="benutzername@domain.com"
                  className="w-full mt-1 bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3 py-2 border border-white/10 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase">Passwort</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full mt-1 bg-zinc-950 text-xs text-white placeholder-zinc-500 rounded-xl px-3 py-2 border border-white/10 focus:border-brand-500 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-brand-600/20"
                >
                  Eintrag Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
