/**
 * Desktop-only labeled sidebar (Kaspersky-style): the desktop window has room a 360px popup
 * doesn't, so instead of the extension's bare icon rail each category gets an icon + label +
 * live item-count badge, grouped under section headers. Password Health and Settings are
 * pinned to the very bottom (the popup keeps those behind a "more" menu in its top bar).
 *
 * Layout/structure salvaged from the former dead-code Sidebar.tsx prototype (2026-07-23),
 * restyled to the app's actual violet/ink theme and wired to the real AppShellProps contract.
 */

import {
  Globe,
  Smartphone,
  UserRound,
  Star,
  Wand,
  KeyRound,
  Contact,
  CreditCard,
  FileText,
  ShieldCheck,
  Settings as SettingsIcon,
} from '../../../extension/src/popup/icons.js';
import type { Category } from '../../../extension/src/popup/Sidebar.js';

type IconComponent = (props: { size?: number }) => React.ReactElement;

const CATEGORIES: { key: Category; icon: IconComponent; label: string }[] = [
  { key: 'login', icon: Globe, label: 'Websites' },
  { key: 'totp', icon: Smartphone, label: 'Authenticator' },
  { key: 'passkey', icon: UserRound, label: 'Passkeys' },
  { key: 'secret', icon: KeyRound, label: 'API Keys & Secrets' },
  { key: 'autofill_identity', icon: Contact, label: 'Identities' },
  { key: 'card', icon: CreditCard, label: 'Bank Cards' },
  { key: 'note', icon: FileText, label: 'Notes' },
  { key: 'favorites', icon: Star, label: 'Favorites' },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
      {children}
    </div>
  );
}

function NavButton({
  active,
  label,
  icon: Icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: IconComponent;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-[13px] font-medium transition ${
        active
          ? 'border-violet-glow/30 bg-violet-glow/15 text-violet-soft shadow-sm shadow-violet-glow/10'
          : 'border-transparent text-white/45 hover:bg-white/5 hover:text-white/75'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={active ? 'text-violet-soft' : 'text-white/35'}>
          <Icon size={16} />
        </span>
        <span className="truncate">{label}</span>
      </span>
      {typeof count === 'number' && count > 0 && (
        <span
          className={`ml-2 shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
            active ? 'bg-violet-glow/25 text-violet-soft' : 'bg-white/10 text-white/40'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function DesktopSidebar({
  active,
  onSelect,
  onGenerator,
  onHealth,
  onSettings,
  counts,
}: {
  active: Category | 'generator' | 'health' | 'settings';
  onSelect: (c: Category) => void;
  onGenerator: () => void;
  onHealth: () => void;
  onSettings: () => void;
  counts?: Partial<Record<Category, number>>;
}) {
  return (
    <nav className="flex w-60 shrink-0 select-none flex-col border-r border-white/[0.07] bg-white/[0.035] p-3">
      <SectionHeader>Vault</SectionHeader>
      <div className="space-y-0.5">
        {CATEGORIES.map(({ key, icon, label }) => (
          <NavButton
            key={key}
            active={active === key}
            label={label}
            icon={icon}
            count={counts?.[key]}
            onClick={() => onSelect(key)}
          />
        ))}
      </div>

      <div className="pt-4">
        <SectionHeader>Tools</SectionHeader>
        <div className="space-y-0.5">
          <NavButton active={active === 'generator'} label="Password Generator" icon={Wand} onClick={onGenerator} />
        </div>
      </div>

      <div className="flex-1" />

      {/* Security tools pinned to the very bottom */}
      <div className="mb-2 h-px w-full bg-white/10" />
      <div className="space-y-0.5">
        <NavButton active={active === 'health'} label="Password Health" icon={ShieldCheck} onClick={onHealth} />
        <NavButton active={active === 'settings'} label="Settings" icon={SettingsIcon} onClick={onSettings} />
      </div>
    </nav>
  );
}
