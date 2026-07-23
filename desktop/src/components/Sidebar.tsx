import {
  Globe,
  UserRound,
  CreditCard,
  KeyRound,
  Smartphone,
  FileText,
  Activity,
  Wand,
  Settings,
} from './icons';

export type CategoryId =
  | 'all'
  | 'login'
  | 'card'
  | 'passkey'
  | 'totp'
  | 'secret'
  | 'health'
  | 'generator'
  | 'settings';

interface SidebarProps {
  activeCategory: CategoryId;
  onSelectCategory: (id: CategoryId) => void;
  counts: Record<string, number>;
}

export function Sidebar({ activeCategory, onSelectCategory, counts }: SidebarProps) {
  const categories = [
    { id: 'all' as const, label: 'Alle Einträge', icon: Globe, count: counts.all || 0 },
    { id: 'login' as const, label: 'Benutzerkonten', icon: UserRound, count: counts.login || 0 },
    { id: 'card' as const, label: 'Bankkarten', icon: CreditCard, count: counts.card || 0 },
    { id: 'passkey' as const, label: 'Passkeys', icon: KeyRound, count: counts.passkey || 0 },
    { id: 'totp' as const, label: 'Authentifikator', icon: Smartphone, count: counts.totp || 0 },
    { id: 'secret' as const, label: 'Notizen & Secrets', icon: FileText, count: counts.secret || 0 },
  ];

  const tools = [
    { id: 'health' as const, label: 'Kennwortprüfung', icon: Activity, badge: 'Audit' },
    { id: 'generator' as const, label: 'Kennwort-Generator', icon: Wand },
    { id: 'settings' as const, label: 'Einstellungen', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-zinc-950/60 backdrop-blur-md border-r border-white/10 flex flex-col justify-between shrink-0 p-3 select-none">
      <div className="space-y-6">
        {/* Vault Categories */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Tresor
          </div>
          <nav className="space-y-0.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-brand-400' : 'text-zinc-500'}`} />
                    <span>{cat.label}</span>
                  </div>
                  {cat.count > 0 && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-brand-500/30 text-brand-200'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tools & Settings */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            Sicherheit & Tools
          </div>
          <nav className="space-y-0.5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeCategory === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => onSelectCategory(tool.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-brand-400' : 'text-zinc-500'}`} />
                    <span>{tool.label}</span>
                  </div>
                  {tool.badge && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-zinc-900/40 rounded-xl border border-white/5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-emerald-400">Zero-Knowledge Vault</span>
        </div>
        <div className="text-[10px] text-zinc-500 mt-1">End-to-End Encrypted (AES-256)</div>
      </div>
    </aside>
  );
}
