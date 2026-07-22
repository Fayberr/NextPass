import { useEffect, useState } from 'react';
import { Button } from '../ui.js';
import {
  Plus,
  Star,
  KeyRound,
  ExternalLink,
  Contact,
  CreditCard,
  FileText,
  Eye,
  EyeOff,
  Copy,
  Check,
} from '../icons.js';
import { send } from '../client.js';
import { copyWithClear } from '../clipboard.js';
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

/**
 * Chrome's own favicon cache (`chrome-extension://<id>/_favicon/`, requires the "favicon"
 * manifest permission) — returns the exact icon Chrome already shows in the tab for that page,
 * transparency and all. Using this instead of an external service (Google's s2/favicons, which
 * sometimes flattens transparent icons onto a white matte) means our preview always matches what
 * the user sees in their own browser tab.
 */
function faviconFor(uris: string[]): string | null {
  const u = uris.find(Boolean);
  if (!u) return null;
  if (typeof chrome === 'undefined' || !chrome.runtime?.getURL) return null;
  try {
    const href = u.includes('://') ? u : `https://${u}`;
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', href);
    url.searchParams.set('size', '32');
    return url.toString();
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

interface QuickField {
  key: string;
  label: string;
  value: string;
  secret?: boolean;
}

/** The handful of fields worth a compact hover preview, per item type — deliberately narrow
 *  (not every field: e.g. no note bodies, no card expiry) to keep the expanded row scannable. */
function quickFieldsFor(type: string, fields: Record<string, unknown> | undefined): QuickField[] {
  if (!fields) return [];
  const str = (k: string) => (typeof fields[k] === 'string' ? (fields[k] as string) : '');
  const out: QuickField[] = [];
  switch (type) {
    case 'login':
      if (str('username')) out.push({ key: 'username', label: 'User', value: str('username') });
      if (str('email')) out.push({ key: 'email', label: 'Email', value: str('email') });
      if (str('password')) out.push({ key: 'password', label: 'Pass', value: str('password'), secret: true });
      break;
    case 'secret':
      if (str('value')) out.push({ key: 'value', label: 'Value', value: str('value'), secret: true });
      break;
    case 'card':
      if (str('number')) out.push({ key: 'number', label: 'Card #', value: str('number'), secret: true });
      if (str('cvv')) out.push({ key: 'cvv', label: 'CVV', value: str('cvv'), secret: true });
      break;
    case 'autofill_identity':
      if (str('email')) out.push({ key: 'email', label: 'Email', value: str('email') });
      if (str('phone')) out.push({ key: 'phone', label: 'Phone', value: str('phone') });
      break;
  }
  return out;
}

function QuickRow({
  field,
  revealed,
  copied,
  onToggleReveal,
  onCopy,
}: {
  field: QuickField;
  revealed: boolean;
  copied: boolean;
  onToggleReveal: () => void;
  onCopy: () => void;
}) {
  const shown = field.secret && !revealed ? '•'.repeat(Math.min(field.value.length, 14)) : field.value;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-white/25">{field.label}</span>
      <span className={`min-w-0 flex-1 truncate text-xs ${field.secret ? 'font-mono' : ''} text-white/70`}>
        {shown}
      </span>
      {field.secret && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleReveal();
          }}
          className="shrink-0 text-white/30 hover:text-white/70"
          title={revealed ? 'Hide' : 'Reveal'}
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopy();
        }}
        className="shrink-0 text-white/30 hover:text-white/70"
        title="Copy"
      >
        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

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
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, Record<string, unknown>>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  // Hovering a row fetches its decrypted fields (once, then cached) so the expand panel can show
  // a quick username/email/password preview — same decrypt operation `get_item` already does for
  // the full detail view, just lazily triggered by hover instead of a click.
  function handleEnter(id: string) {
    setOpenId(id);
    if (id in detail) return;
    void send({ kind: 'get_item', id }).then((res) => {
      if (res.ok && res.kind === 'item') {
        setDetail((d) => ({ ...d, [id]: res.fields as Record<string, unknown> }));
      }
    });
  }

  function handleLeave(id: string) {
    setOpenId((cur) => (cur === id ? null : cur));
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function copyField(key: string, value: string) {
    await copyWithClear(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1200);
  }

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
            const isOpen = openId === item.id;
            const quickFields = quickFieldsFor(item.type, detail[item.id]);
            return (
              <div
                key={item.id}
                onMouseEnter={() => handleEnter(item.id)}
                onMouseLeave={() => handleLeave(item.id)}
                className="mb-1.5 flex w-full flex-col rounded-xl border border-transparent bg-white/[0.035] px-3 py-2.5 transition-colors duration-200 ease-out hover:bg-white/[0.065]"
              >
                <div className="flex w-full items-center gap-3">
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

                {quickFields.length > 0 && (
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-2 space-y-1.5 border-t border-[rgba(255,255,255,0.06)] pt-2 pl-10">
                        {quickFields.map((f) => {
                          const key = `${item.id}:${f.key}`;
                          return (
                            <QuickRow
                              key={f.key}
                              field={f}
                              revealed={revealed.has(key)}
                              copied={copiedKey === key}
                              onToggleReveal={() => toggleReveal(key)}
                              onCopy={() => void copyField(key, f.value)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
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
