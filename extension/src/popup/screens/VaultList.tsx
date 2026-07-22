import { useEffect, useState } from 'react';
import { Button } from '../ui.js';
import { Plus, Star, KeyRound, ExternalLink, Contact, CreditCard, FileText } from '../icons.js';
import { send } from '../client.js';
import { TotpCode } from '../TotpCode.js';
import type { ItemSummary } from '../../lib/messages.js';
import type { Category } from '../Sidebar.js';

/** Distinct row icon for the item types that don't have a favicon/live-code to show instead. */
const ROW_ICON: Partial<Record<Category, (props: { size?: number; className?: string }) => React.ReactElement>> = {
  secret: KeyRound,
  autofill_identity: Contact,
  card: CreditCard,
  note: FileText,
};

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

function siteHref(u: string): string {
  return u.includes('://') ? u : `https://${u}`;
}

const CATEGORY_LABEL: Record<Category, string> = {
  login: 'Websites',
  totp: 'Authenticator',
  passkey: 'Passkeys',
  secret: 'API Keys & Secrets',
  autofill_identity: 'Identities',
  card: 'Bank Cards',
  note: 'Notes',
  favorites: 'Favorites',
};

// Passkeys/Favorites never reach this (showAdd is false for them), so no entry needed there.
const ADD_LABEL: Record<Category, string> = {
  login: 'Add login',
  totp: 'Add code',
  passkey: 'Add',
  secret: 'Add secret',
  autofill_identity: 'Add identity',
  card: 'Add card',
  note: 'Add note',
  favorites: 'Add',
};

export function VaultList({
  category,
  q,
  reloadKey,
  onSelect,
  onAdd,
}: {
  category: Category;
  q: string;
  reloadKey: number;
  onSelect: (id: string) => void;
  /** Add a new item in the currently active category (parent knows which form to open). */
  onAdd: () => void;
}) {
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await send({ kind: 'list_items' });
    if (res.ok && res.kind === 'items') setItems(res.items);
    setLoading(false);
  }

  async function toggleFav(id: string, favorite: boolean) {
    // Optimistic: flip locally, then persist + reload to reflect re-sorting.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, favorite } : i)));
    await send({ kind: 'set_favorite', id, favorite });
    await load();
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const byCategory = items.filter((i) => (category === 'favorites' ? i.favorite : i.type === category));
  const filtered = byCategory.filter(
    (i) =>
      i.name.toLowerCase().includes(q.toLowerCase()) ||
      (i.username ?? '').toLowerCase().includes(q.toLowerCase()) ||
      i.uris.some((u) => u.toLowerCase().includes(q.toLowerCase())),
  );

  // Passkeys have no manual creation flow (only minted via a WebAuthn ceremony) and Favorites
  // isn't a creation context, so the "Add" footer is hidden for those two only.
  const showAdd = category !== 'passkey' && category !== 'favorites';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <span className="text-xs font-medium text-white/40">{CATEGORY_LABEL[category]}</span>
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
          {byCategory.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <p className="p-4 text-center text-xs text-white/30">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-white/30">
            {byCategory.length === 0 ? 'No items yet.' : 'No matches.'}
          </p>
        ) : (
          filtered.map((item) => {
            const fav = faviconFor(item.uris);
            const site = item.uris.find(Boolean);
            const RowIcon = ROW_ICON[item.type as Category];
            return (
              <div
                key={item.id}
                className="mb-1.5 flex w-full items-center gap-3 rounded-xl border border-transparent bg-white/[0.035] px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.065]"
              >
                <button
                  onClick={() => onSelect(item.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
                    {item.totp ? (
                      <KeyRound size={16} className="text-violet-soft" />
                    ) : fav ? (
                      <img src={fav} alt="" className="h-full w-full object-cover" />
                    ) : RowIcon ? (
                      <RowIcon size={16} className="text-white/40" />
                    ) : (
                      <span className="text-xs text-white/40">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold tracking-tight text-white/90">
                      {item.name}
                    </div>
                    {item.username && (
                      <div className="mt-1.5 truncate text-xs text-white/40">{item.username}</div>
                    )}
                  </div>
                </button>
                {item.totp && (
                  <div className="shrink-0">
                    <TotpCode secret={item.totp} label="" compact />
                  </div>
                )}
                {site && (
                  <a
                    href={siteHref(site)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Open site"
                    className="shrink-0 rounded-md p-1 text-white/20 transition hover:bg-white/10 hover:text-white/50"
                  >
                    <ExternalLink size={14} />
                  </a>
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

      {showAdd && (
        <footer className="flex gap-2 border-t border-[rgba(255,255,255,0.07)] p-3">
          <Button className="flex-1" onClick={onAdd}>
            <Plus size={16} /> {ADD_LABEL[category]}
          </Button>
        </footer>
      )}
    </div>
  );
}
