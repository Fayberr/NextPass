import { useState } from 'react';
import { Favicon } from './Favicon';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Grid,
  List,
  AlertTriangle,
  Pencil,
  Trash,
} from './icons';

export interface VaultItem {
  id: string;
  title: string;
  type: 'login' | 'card' | 'passkey' | 'totp' | 'secret';
  username?: string;
  password?: string;
  url?: string;
  totpSecret?: string;
  cardNumber?: string;
  cardExp?: string;
  cardName?: string;
  cardCvc?: string;
  notes?: string;
  favorite?: boolean;
  securityStatus?: 'compromised' | 'weak' | 'reused' | 'strong';
  updatedAt: string;
}

interface VaultGridProps {
  items: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
  onAddItem: () => void;
  onEditItem: (item: VaultItem) => void;
  onDeleteItem: (id: string) => void;
}

export function VaultGrid({ items, onSelectItem, onAddItem, onEditItem, onDeleteItem }: VaultGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealedPw, setRevealedPw] = useState<Record<string, boolean>>({});

  const handleCopy = (text: string | undefined, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePw = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPw((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openUrl = (url: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    const electronAPI = (window as any).electronAPI;
    const target = url.startsWith('http') ? url : `https://${url}`;
    if (electronAPI?.openExternal) {
      electronAPI.openExternal(target);
    } else {
      window.open(target, '_blank');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-6 overflow-hidden">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onAddItem}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-brand-600/20 border border-brand-400/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>Konto hinzufügen</span>
          </button>

          <span className="text-xs text-zinc-500 font-mono">
            {items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'}
          </span>
        </div>

        {/* Grid vs List View Switcher */}
        <div className="flex items-center bg-zinc-900/80 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Kachel-Raster view"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Kompakte Listen view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Vault Content */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-12 text-center">
          <Favicon title="N" size={48} />
          <h3 className="text-sm font-semibold text-zinc-300 mt-4">Keine Einträge gefunden</h3>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            Fügen Sie Ihren ersten Login, eine Bankkarte oder ein Secret über die "+ Konto hinzufügen" Schaltfläche oben hinzu.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* CARD GRID VIEW (Kaspersky style with modern glassmorphism cards) */
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="group bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 hover:border-brand-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-brand-500/5 cursor-pointer backdrop-blur-md relative overflow-hidden"
            >
              {/* Security Issue Banner */}
              {item.securityStatus && item.securityStatus !== 'strong' && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium bg-amber-400/10 border-b border-amber-400/20 px-4 py-1 -mx-4 -mt-4 mb-3">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span className="capitalize">{item.securityStatus} Password Issue</span>
                </div>
              )}

              {/* Header: Favicon + Title + URL */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Favicon url={item.url} title={item.title} size={32} />
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-zinc-100 truncate group-hover:text-brand-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 truncate font-mono">
                        {item.url || 'Keine Webadresse'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditItem(item); }}
                      className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-white/10 rounded-md"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                      className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md"
                      title="Delete"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="mt-4 bg-zinc-950/60 rounded-xl p-2.5 border border-white/5 space-y-2">
                  {/* Username / Email */}
                  {item.username && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 truncate max-w-[170px] font-mono">
                        {item.username}
                      </span>
                      <button
                        onClick={(e) => handleCopy(item.username, `user-${item.id}`, e)}
                        className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-colors"
                        title="Copy Username"
                      >
                        {copiedField === `user-${item.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Password */}
                  {item.password && (
                    <div className="flex items-center justify-between text-xs border-t border-white/5 pt-2">
                      <span className="font-mono text-zinc-300">
                        {revealedPw[item.id] ? item.password : '••••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => togglePw(item.id, e)}
                          className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-colors"
                          title="Reveal Password"
                        >
                          {revealedPw[item.id] ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => handleCopy(item.password, `pw-${item.id}`, e)}
                          className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-colors"
                          title="Copy Password"
                        >
                          {copiedField === `pw-${item.id}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card specific display */}
                  {item.cardNumber && (
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                      <span>•••• •••• •••• {item.cardNumber.slice(-4)}</span>
                      <button
                        onClick={(e) => handleCopy(item.cardNumber, `card-${item.id}`, e)}
                        className="p-1 text-zinc-500 hover:text-white"
                      >
                        {copiedField === `card-${item.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button: Open Website */}
              {item.url && (
                <button
                  onClick={(e) => openUrl(item.url, e)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-1.5 bg-zinc-800/80 hover:bg-brand-600/30 hover:text-brand-300 text-zinc-300 font-medium text-xs rounded-xl border border-white/10 hover:border-brand-500/30 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Im Browser öffnen</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* COMPACT TABLE LIST VIEW */
        <div className="flex-1 overflow-y-auto border border-white/10 rounded-2xl bg-zinc-900/50 backdrop-blur-md">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-zinc-400 border-b border-white/10 sticky top-0 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-4">Titel & Webadresse</th>
                <th className="py-3 px-4">Benutzername</th>
                <th className="py-3 px-4">Passwort</th>
                <th className="py-3 px-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Favicon url={item.url} title={item.title} size={24} />
                      <div>
                        <div className="font-semibold text-zinc-100">{item.title}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{item.url || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-400">{item.username || '—'}</td>
                  <td className="py-3 px-4 font-mono text-zinc-400">
                    {item.password ? '••••••••••••' : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.username && (
                        <button
                          onClick={(e) => handleCopy(item.username, `user-${item.id}`, e)}
                          className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10"
                          title="Copy Username"
                        >
                          {copiedField === `user-${item.id}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      {item.password && (
                        <button
                          onClick={(e) => handleCopy(item.password, `pw-${item.id}`, e)}
                          className="p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10"
                          title="Copy Password"
                        >
                          {copiedField === `pw-${item.id}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      {item.url && (
                        <button
                          onClick={(e) => openUrl(item.url, e)}
                          className="p-1 text-zinc-400 hover:text-brand-400 rounded hover:bg-white/10"
                          title="Open Website"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
