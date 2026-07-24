import { useState, useEffect, useRef } from 'react';
import { Favicon } from './Favicon';
import { Search, Copy, Check, X, Sparkles } from './icons';
import { send } from '../../../extension/src/popup/client.js';
import { copyWithClear } from '../../../extension/src/popup/clipboard.js';
import type { ItemSummary } from '../../../extension/src/lib/messages.js';

interface QuickSearchOverlayProps {
  isOpen: boolean;
  /** `returnToPreviousApp` = a copy just happened via the global hotkey flow, so the caller may
   *  re-minimize the window and hand focus straight back to where the user was typing. */
  onClose: (opts?: { returnToPreviousApp?: boolean }) => void;
}

/**
 * System-wide quick search (global hotkey, default Ctrl+Alt+A): type a site/name, click (or
 * Enter) to copy that login's password - honoring the clipboard auto-clear setting - then get
 * bounced straight back to the app you came from.
 */
export function QuickSearchOverlay({ isOpen, onClose }: QuickSearchOverlayProps) {
  const [query, setQuery] = useState<string>('');
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      // Fresh fetch on every open - the vault may have changed (or locked) since last time.
      void (async () => {
        const state = await send({ kind: 'get_state' });
        const isUnlocked = state.ok && state.kind === 'state' && state.state.unlocked;
        setUnlocked(isUnlocked);
        if (!isUnlocked) {
          setItems([]);
          return;
        }
        const res = await send({ kind: 'list_items' });
        setItems(res.ok && res.kind === 'items' ? res.items.filter((i) => i.type === 'login') : []);
      })();
    } else {
      setQuery('');
      setCopiedId(null);
      setBusyId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.toLowerCase();
  const filtered = items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      (item.username && item.username.toLowerCase().includes(q)) ||
      item.uris.some((u) => u.toLowerCase().includes(q)),
  );

  const handleCopyPw = async (item: ItemSummary) => {
    if (busyId || copiedId) return;
    setBusyId(item.id);
    try {
      const res = await send({ kind: 'get_item', id: item.id });
      const password =
        res.ok && res.kind === 'item' ? ((res.fields as { password?: string }).password ?? '') : '';
      if (!password) return;
      await copyWithClear(password); // honors the clipboard auto-clear setting
      setCopiedId(item.id);
      setTimeout(() => {
        setCopiedId(null);
        onClose({ returnToPreviousApp: true });
      }, 700);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      onClick={() => onClose()}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-surface/95 border border-brand-500/40 rounded-2xl shadow-2xl shadow-brand-500/20 overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Bar Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="h-5 w-5 text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) void handleCopyPw(filtered[0]!);
            }}
            placeholder="Search logins by site, name or username…"
            className="w-full bg-transparent text-sm text-white placeholder-white/35 focus:outline-none font-medium"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-brand-500/20 text-brand-300 rounded-lg text-[10px] font-mono border border-brand-500/30">
            <Sparkles className="h-3 w-3" />
            <span>Quick Search</span>
          </div>
          <button onClick={() => onClose()} className="p-1 text-white/40 hover:text-white rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5">
          {unlocked === false ? (
            <div className="p-8 text-center text-xs text-white/40 font-mono">
              The vault is locked - unlock NextPass first, then press the hotkey again.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-white/40 font-mono">
              {unlocked === null ? 'Loading…' : 'No matching logins found'}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => void handleCopyPw(item)}
                className="group p-3 hover:bg-brand-600/20 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Favicon url={item.uris[0] ?? ''} title={item.name} size={28} />
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-white/50 font-mono truncate">
                      {item.username || item.uris[0] || 'No username'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-white/40 group-hover:text-white/75">
                    {copiedId === item.id ? 'Password copied' : 'Click to copy password'}
                  </span>
                  <button className="p-2 bg-white/10 group-hover:bg-brand-600 text-white/75 group-hover:text-[#fff] rounded-lg transition-colors">
                    {copiedId === item.id ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
