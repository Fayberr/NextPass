import { useState, useEffect, useRef } from 'react';
import { Favicon } from './Favicon';
import { Search, Copy, Check, X, Sparkles } from './icons';
import type { VaultItem } from './VaultGrid';

interface QuickSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  items: VaultItem[];
}

export function QuickSearchOverlay({ isOpen, onClose, items }: QuickSearchOverlayProps) {
  const [query, setQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    (item.url && item.url.toLowerCase().includes(query.toLowerCase())) ||
    (item.username && item.username.toLowerCase().includes(query.toLowerCase()))
  );

  const handleCopyPw = (item: VaultItem) => {
    if (!item.password) return;
    navigator.clipboard.writeText(item.password);
    setCopiedId(item.id);
    setTimeout(() => {
      setCopiedId(null);
      onClose();
    }, 1000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-zinc-900/95 border border-brand-500/40 rounded-2xl shadow-2xl shadow-brand-500/20 overflow-hidden flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Bar Header */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Search className="h-5 w-5 text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quick Search Password HUD (Type domain or title)..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none font-medium"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-brand-500/20 text-brand-300 rounded-lg text-[10px] font-mono border border-brand-500/30">
            <Sparkles className="h-3 w-3" />
            <span>Spotlight</span>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              Keine passenden Zugangsdaten gefunden
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleCopyPw(item)}
                className="group p-3 hover:bg-brand-600/20 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Favicon url={item.url} title={item.title} size={28} />
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white group-hover:text-brand-300 transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">
                      {item.username || item.url || 'Kein Benutzername'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300">
                    Klicken zum Kopieren
                  </span>
                  <button className="p-2 bg-zinc-800 group-hover:bg-brand-600 text-zinc-300 group-hover:text-white rounded-lg transition-colors">
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
