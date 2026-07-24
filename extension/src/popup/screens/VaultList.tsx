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
  UserRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  LayoutGrid,
  Rows,
} from '../icons.js';
import { send } from '../client.js';
import { copyWithClear } from '../clipboard.js';
import { TotpCode } from '../TotpCode.js';
import { baseDomain } from '@pm/shared';
import type { ItemSummary } from '../../lib/messages.js';
import type { Category } from '../Sidebar.js';

/** Distinct row icon for the item types that don't have a favicon/live-code to show instead. */
const ROW_ICON: Partial<Record<Category, (props: { size?: number; className?: string }) => React.ReactElement>> = {
  secret: KeyRound,
  autofill_identity: Contact,
  card: CreditCard,
  note: FileText,
  passkey: UserRound,
};

/**
 * Chrome's own favicon cache (`chrome-extension://<id>/_favicon/`, requires the "favicon"
 * manifest permission) - returns the exact icon Chrome already shows in the tab for that page,
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

/** Normalized hostname (no "www.") used as the grouping key for logins - two saved accounts
 *  for the same site (e.g. two demoqa.com logins) should visually nest under one site card
 *  instead of appearing as unrelated flat rows. */
function hostnameOf(uris: string[]): string | null {
  const u = uris.find(Boolean);
  if (!u) return null;
  try {
    const href = u.includes('://') ? u : `https://${u}`;
    let h = new URL(href).hostname.toLowerCase();
    if (h.startsWith('www.')) h = h.slice(4);
    return h || null;
  } catch {
    return null;
  }
}

const faviconTransparentCache = new Map<string, string>();

async function getTransparentFavicon(rawUrl: string): Promise<string> {
  if (faviconTransparentCache.has(rawUrl)) {
    return faviconTransparentCache.get(rawUrl)!;
  }

  if (rawUrl.startsWith('chrome-extension://')) {
    faviconTransparentCache.set(rawUrl, rawUrl);
    return rawUrl;
  }

  try {
    const res = await fetch(rawUrl);
    if (!res.ok) return rawUrl;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return rawUrl;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const w = canvas.width;
    const h = canvas.height;
    const cornerIndices = [
      0,
      (w - 1) * 4,
      (h - 1) * w * 4,
      (h * w - 1) * 4,
    ];

    const isWhiteBackground = cornerIndices.every(
      (idx) => data[idx] >= 235 && data[idx + 1] >= 235 && data[idx + 2] >= 235
    );

    if (isWhiteBackground) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] >= 235 && data[i + 1] >= 235 && data[i + 2] >= 235) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const transparentDataUrl = canvas.toDataURL('image/png');
      faviconTransparentCache.set(rawUrl, transparentDataUrl);
      return transparentDataUrl;
    }

    faviconTransparentCache.set(rawUrl, rawUrl);
    return rawUrl;
  } catch {
    faviconTransparentCache.set(rawUrl, rawUrl);
    return rawUrl;
  }
}

/** Multi-stage transparent favicon renderer.
 *  - Strips white background mattes dynamically to 100% transparency.
 *  - High-quality image smoothing & crisp high-dpi rendering.
 */
function FaviconIcon({
  uris,
  name,
  fallbackIcon: RowIcon,
}: {
  uris: string[];
  name: string;
  fallbackIcon?: any;
}) {
  const domain = hostnameOf(uris);
  const baseDom = domain ? baseDomain(domain) : null;
  const isFayberDomain = domain?.endsWith('fayber.dev');
  const primaryFav = faviconFor(uris);

  const [src, setSrc] = useState<string | null>(null);
  const [step, setStep] = useState<'google' | 'duck' | 'chrome' | 'none'>('none');

  useEffect(() => {
    let active = true;
    const d = hostnameOf(uris);
    const bd = d ? baseDomain(d) : null;
    const isF = d?.endsWith('fayber.dev');
    const f = faviconFor(uris);

    async function loadFavicon() {
      let targetUrl: string | null = null;
      let nextStep: 'google' | 'duck' | 'chrome' | 'none' = 'none';

      if (isF && f) {
        targetUrl = f;
        nextStep = 'chrome';
      } else if (d || bd) {
        const target = d || bd;
        targetUrl = `https://www.google.com/s2/favicons?domain=${target}&sz=128`;
        nextStep = 'google';
      } else if (f) {
        targetUrl = f;
        nextStep = 'chrome';
      }

      if (!active) return;

      if (targetUrl) {
        setStep(nextStep);
        const transparentUrl = await getTransparentFavicon(targetUrl);
        if (active) setSrc(transparentUrl);
      } else {
        setStep('none');
        setSrc(null);
      }
    }

    void loadFavicon();

    return () => {
      active = false;
    };
  }, [uris]);

  const handleError = () => {
    if (step === 'google' && baseDom) {
      setStep('duck');
      const target = `https://icons.duckduckgo.com/ip3/${baseDom}.ico`;
      void getTransparentFavicon(target).then((tUrl) => setSrc(tUrl));
    } else if (step === 'duck') {
      const f = faviconFor(uris);
      if (f) {
        setStep('chrome');
        setSrc(f);
      } else {
        setStep('none');
        setSrc(null);
      }
    } else {
      setStep('none');
      setSrc(null);
    }
  };

  if (src && step !== 'none') {
    return (
      <img
        src={src}
        alt=""
        onError={handleError}
        className="h-full w-full rounded-md object-cover"
        style={{ imageRendering: '-webkit-optimize-contrast' }}
      />
    );
  }

  if (RowIcon) {
    return <RowIcon size={16} className="text-white/40" />;
  }

  return <span className="text-xs text-white/40">{name.charAt(0).toUpperCase()}</span>;
}

/** Desktop-only affordance: the 360px popup stays list-only, but the desktop window has room
 *  for a Kaspersky-style card grid, so the grid/list toggle renders only under Electron. */
const IS_DESKTOP = typeof navigator !== 'undefined' && /\bElectron\//.test(navigator.userAgent);

const VIEW_MODE_KEY = 'pm_vault_view_mode';

type ViewMode = 'grid' | 'list';

function initialViewMode(): ViewMode {
  if (!IS_DESKTOP) return 'list';
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    if (v === 'list' || v === 'grid') return v;
  } catch {}
  return 'grid';
}

interface ItemGroup {
  key: string;
  items: ItemSummary[];
}

/** Groups logins sharing a normalized hostname; items without a parseable URL (or falling
 *  back to a shared exact name) still get grouped by name so nothing regresses to ungrouped. */
function groupByWebsite(list: ItemSummary[]): ItemGroup[] {
  const map = new Map<string, ItemGroup>();
  const order: string[] = [];
  for (const item of list) {
    const key = hostnameOf(item.uris) ?? `name:${item.name.trim().toLowerCase()}`;
    let g = map.get(key);
    if (!g) {
      g = { key, items: [] };
      map.set(key, g);
      order.push(key);
    }
    g.items.push(item);
  }
  return order.map((k) => map.get(k)!);
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

/** The handful of fields worth a compact hover preview, per item type - deliberately narrow
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
    case 'passkey':
      if (str('rpId')) out.push({ key: 'rpId', label: 'Domain', value: str('rpId') });
      if (str('userName') || str('userDisplayName'))
        out.push({ key: 'userName', label: 'User', value: str('userName') || str('userDisplayName') });
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  function switchView(mode: ViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {}
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
  // a quick username/email/password preview - same decrypt operation `get_item` already does for
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

  // Only logins get grouped by website - the other categories (secrets, cards, notes,
  // identities) don't have the "same site, multiple accounts" scenario this solves.
  const groups: ItemGroup[] =
    category === 'login' ? groupByWebsite(filtered) : filtered.map((i) => ({ key: i.id, items: [i] }));

  function renderRow(item: ItemSummary, nested = false) {
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
        className={`flex w-full flex-col rounded-xl border border-transparent bg-white/[0.035] px-3 py-2.5 transition-colors duration-200 ease-out hover:bg-white/[0.065] ${
          nested ? '' : 'mb-1.5'
        }`}
      >
        <div className="flex w-full items-center gap-3">
          <button onClick={() => onSelect(item.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
              {item.totp ? (
                <KeyRound size={16} className="text-violet-soft" />
              ) : (
                <FaviconIcon uris={item.uris} name={item.name} fallbackIcon={RowIcon} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold tracking-tight text-white/90">{item.name}</div>
              {item.username && <div className="mt-1.5 truncate text-xs text-white/40">{item.username}</div>}
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
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2 pl-10">
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
  }

  /** Grid-mode card: same data + lazy hover quick-fields as a list row, just laid out as a
   *  Kaspersky-style tile. Login grouping is intentionally skipped here - in a grid, one card
   *  per account reads better than a nested "N accounts" tile. */
  function renderCard(item: ItemSummary) {
    const site = item.uris.find(Boolean);
    const RowIcon = ROW_ICON[item.type as Category];
    const isOpen = openId === item.id;
    const quickFields = quickFieldsFor(item.type, detail[item.id]);
    return (
      <div
        key={item.id}
        onMouseEnter={() => handleEnter(item.id)}
        onMouseLeave={() => handleLeave(item.id)}
        className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 transition-colors duration-200 ease-out hover:border-violet-glow/25 hover:bg-white/[0.055]"
      >
        <div className="flex w-full items-start gap-3">
          <button onClick={() => onSelect(item.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
              {item.totp ? (
                <KeyRound size={18} className="text-violet-soft" />
              ) : (
                <FaviconIcon uris={item.uris} name={item.name} fallbackIcon={RowIcon} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold tracking-tight text-white/90">{item.name}</div>
              {(item.username || site) && (
                <div className="mt-1 truncate text-xs text-white/40">{item.username || site}</div>
              )}
            </div>
          </button>
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

        {item.totp && (
          <div className="mt-3">
            <TotpCode secret={item.totp} label="" compact />
          </div>
        )}

        {quickFields.length > 0 && (
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-2.5">
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

        {site && (
          <a
            href={siteHref(site)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] py-1.5 text-xs font-medium text-white/50 transition hover:bg-white/[0.07] hover:text-white/80"
          >
            <ExternalLink size={13} />
            Open site
          </a>
        )}
      </div>
    );
  }

  function renderGroup(group: ItemGroup) {
    const first = group.items[0];
    if (!first) return null;
    if (group.items.length === 1) return renderRow(first);
    const fav = faviconFor(first.uris);
    const collapsed = collapsedGroups.has(group.key);
    return (
      <div
        key={group.key}
        className="mb-1.5 overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02]"
      >
        <button
          onClick={() => toggleGroup(group.key)}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5">
            <FaviconIcon uris={first.uris} name={first.name} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-tight text-white/90">{first.name}</div>
            <div className="mt-1.5 truncate text-xs text-white/40">{group.items.length} accounts</div>
          </div>
          <ChevronDown
            size={14}
            className={`shrink-0 text-white/30 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
        <div
          className={`grid transition-[grid-template-rows] duration-200 ease-out ${
            collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-1 border-t border-white/[0.05] p-1.5">
              {group.items.map((item) => renderRow(item, true))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
        <span className="text-xs font-medium text-white/40">{CATEGORY_LABEL[category]}</span>
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/40">
          {byCategory.length}
        </span>
        {IS_DESKTOP && (
          <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.03] p-0.5">
            <button
              type="button"
              title="Grid view"
              onClick={() => switchView('grid')}
              className={`rounded-md p-1 transition ${
                viewMode === 'grid'
                  ? 'bg-violet-glow/15 text-violet-soft'
                  : 'text-white/30 hover:bg-white/5 hover:text-white/60'
              }`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              title="List view"
              onClick={() => switchView('list')}
              className={`rounded-md p-1 transition ${
                viewMode === 'list'
                  ? 'bg-violet-glow/15 text-violet-soft'
                  : 'text-white/30 hover:bg-white/5 hover:text-white/60'
              }`}
            >
              <Rows size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <p className="p-4 text-center text-xs text-white/30">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-white/30">
            {byCategory.length === 0 ? 'No items yet.' : 'No matches.'}
          </p>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] items-start gap-3 p-1">
            {filtered.map((item) => renderCard(item))}
          </div>
        ) : (
          groups.map((group) => renderGroup(group))
        )}
      </div>

      {showAdd && (
        <footer className="flex gap-2 border-t border-white/[0.07] p-3">
          <Button className="flex-1" onClick={onAdd}>
            <Plus size={16} /> {ADD_LABEL[category]}
          </Button>
        </footer>
      )}
    </div>
  );
}
