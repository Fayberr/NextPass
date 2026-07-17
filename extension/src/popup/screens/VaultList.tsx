import { useEffect, useState } from 'react';
import { Button, Input } from '../ui.js';
import { Lock, Plus, RefreshCw, Star } from '../icons.js';
import { send } from '../client.js';
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
  onLock,
}: {
  onSelect: (id: string) => void;
  onAdd: () => void;
  onLock: () => void;
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
          <Button variant="subtle" onClick={doSync} disabled={syncing} title="Sync">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : undefined} />
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
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                  {fav ? (
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
                {item.favorite && <Star size={14} filled className="text-violet-soft" />}
              </button>
            );
          })
        )}
      </div>

      <footer className="border-t border-white/5 p-3">
        <Button className="w-full" onClick={onAdd}>
          <Plus size={16} /> Add login
        </Button>
      </footer>
    </div>
  );
}
