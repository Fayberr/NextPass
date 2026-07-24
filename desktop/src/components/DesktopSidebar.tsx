/**
 * Desktop-only icon rail: same category set as the extension popup's Sidebar, but bigger and
 * more spacious since the desktop window isn't squeezed into a 360px popup. Also carries
 * Password Health and Settings at the very bottom of the rail (the popup keeps those behind a
 * "more" menu in its top bar for space reasons; desktop has the room to make them permanent
 * rail icons instead).
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

const CATEGORIES: { key: Category; icon: (props: { size?: number }) => React.ReactElement; title: string }[] = [
  { key: 'login', icon: Globe, title: 'Websites' },
  { key: 'totp', icon: Smartphone, title: 'Authenticator' },
  { key: 'passkey', icon: UserRound, title: 'Passkeys' },
  { key: 'secret', icon: KeyRound, title: 'API Keys & Secrets' },
  { key: 'autofill_identity', icon: Contact, title: 'Identities' },
  { key: 'card', icon: CreditCard, title: 'Bank Cards' },
  { key: 'note', icon: FileText, title: 'Notes' },
  { key: 'favorites', icon: Star, title: 'Favorites' },
];

function RailButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition ${
        active
          ? 'border-violet-glow/30 bg-violet-glow/15 text-violet-soft shadow-sm shadow-violet-glow/10'
          : 'border-transparent text-white/40 hover:border-[rgba(255,255,255,0.07)] hover:bg-white/5 hover:text-white/70'
      }`}
    >
      {children}
    </button>
  );
}

export function DesktopSidebar({
  active,
  onSelect,
  onGenerator,
  onHealth,
  onSettings,
}: {
  active: Category | 'generator' | 'health' | 'settings';
  onSelect: (c: Category) => void;
  onGenerator: () => void;
  onHealth: () => void;
  onSettings: () => void;
}) {
  return (
    <nav className="flex w-24 shrink-0 flex-col items-center gap-2.5 border-r border-[rgba(255,255,255,0.07)] bg-white/[0.035] py-5">
      {CATEGORIES.map(({ key, icon: Icon, title }) => (
        <RailButton key={key} active={active === key} title={title} onClick={() => onSelect(key)}>
          <Icon size={24} />
        </RailButton>
      ))}
      <div className="my-1.5 h-px w-8 bg-white/10" />
      <RailButton active={active === 'generator'} title="Generator" onClick={onGenerator}>
        <Wand size={24} />
      </RailButton>

      <div className="flex-1" />

      {/* Tools pinned to the very bottom of the rail */}
      <div className="my-1.5 h-px w-8 bg-white/10" />
      <RailButton active={active === 'health'} title="Password Health" onClick={onHealth}>
        <ShieldCheck size={24} />
      </RailButton>
      <RailButton active={active === 'settings'} title="Settings" onClick={onSettings}>
        <SettingsIcon size={24} />
      </RailButton>
    </nav>
  );
}
