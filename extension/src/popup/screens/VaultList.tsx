import { useEffect, useState } from 'react';
import { Button, Input } from '../ui.js';
import { Lock, Plus, RefreshCw, Star, KeyRound, ShieldCheck, Settings } from '../icons.js';
import { send } from '../client.js';
import { TotpCode } from '../TotpCode.js';
import type { ItemSummary } from '../../lib/messages.js';

function faviconFor(uris: string[]): string | null {
  const u = uris.find(Boolean);
  if (!u) return null;
  try {
    const host = new URL(u.includes('://') ? u : `https://${u}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return null;
  }
}

export function VaultList({
  onSelect,
  onAdd,
  onAddTotp,
  onLock,
  onGenerator,
  onHealth,
  onSettings,
}: {
  onSelect: (id: string) => void;
  onAdd: () => void;
  onAddTotp: () => void;
  onLock: () => void;
  onGenerator: () => void;
  onHealth: () => void;
  onSettings: () => void;
}) {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [q, setQ] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await send({ kind: 'list_items' });
    if (res.ok && res.kind === 'items') setItems(res.items);
    setLoading(false);
  }

  async function doSync() {
    setSyncing(true);
    await send({ kind: 'sync' });
    await load();
    setSyncing(false);
  }

  async function toggleFav(id: string, favorite: boolean) {
    // Optimistic: flip locally, then persist + reload to reflect re-sorting.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, favorite } : i)));
    await send({ kind: 'set_favorite', id, favorite });
    await load();
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(q.toLowerCase()) ||
      (i.username ?? '').toLowerCase().includes(q.toLowerCase()) ||
      i.uris.some((u) => u.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="flex h-[500px] flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <span className="text-sm font-semibold">Vault</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">
          {items.length}
        </span>
        <div className="ml-auto flex gap-1">
          <Button variant="subtle" onClick={onGenerator} title="Password generator">
            <KeyRound size={16} />
          </Button>
          <Button variant="subtle" onClick={onHealth} title="Password health">
            <ShieldCheck size={16} />
          </Button>
          <Button variant="subtle" onClick={doSync} disabled={syncing} title="Sync">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : undefined} />
          </Button>
          <Button variant="subtle" onClick={onSettings} title="Settings">
            <Settings size={16} />
          </Button>
          <Button variant="subtle" onClick={onLock} title="Lock">
            <Lock size={16} />
          </Button>
        </div>
      </header>

      <div className="p-3">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <p className="p-4 text-center text-xs text-white/30">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-white/30">
            {items.length === 0 ? 'No items yet. Add your first login.' : 'No matches.'}
          </p>
        ) : (
          filtered.map((item) => {
            const fav = faviconFor(item.uris);
            return (
              <div
                key={item.id}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5"
              >
                <button
                  onClick={() => onSelect(item.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                    {item.totp ? (
                      <KeyRound size={16} className="text-violet-soft" />
                    ) : fav ? (
                      <img src={fav} alt="" className="h-4 w-4" />
                    ) : (
                      <span className="text-xs text-white/40">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-white/90">{item.name}</div>
                    {item.username && (
                      <div className="truncate text-xs text-white/40">{item.username}</div>
                    )}
                  </div>
                </button>
                {item.totp && (
                  <div className="shrink-0">
                    <TotpCode secret={item.totp} label="" compact />
                  </div>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  title={item.favorite ? 'Unfavorite' : 'Favorite'}
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleFav(item.id, !item.favorite);
                  }}
                  className={`shrink-0 cursor-pointer rounded-md p-1 transition hover:bg-white/10 ${
                    item.favorite ? 'text-violet-soft' : 'text-white/20 hover:text-white/50'
                  }`}
                >
                  <Star size={14} filled={item.favorite} />
                </span>
              </div>
            );
          })
        )}
      </div>

      <footer className="flex gap-2 border-t border-white/5 p-3">
        <Button className="flex-1" onClick={onAdd}>
          <Plus size={16} /> Add login
        </Button>
        <Button variant="ghost" onClick={onAddTotp} title="Add authenticator code">
          <KeyRound size={16} /> Code
        </Button>
      </footer>
    </div>
  );
}
