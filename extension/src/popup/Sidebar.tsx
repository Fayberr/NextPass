/**
 * Persistent left icon-rail, Kaspersky-style category switcher. Each icon maps to a real,
 * already-implemented item type (`login`/`totp`/`passkey`) or a cross-type favorite filter —
 * we deliberately don't stub categories (bank cards, addresses) that have no backing data model.
 * Generator is a standalone tool, not a filtered list, so it gets its own button below a divider.
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
} from './icons.js';

export type Category =
  | 'login'
  | 'totp'
  | 'passkey'
  | 'secret'
  | 'autofill_identity'
  | 'card'
  | 'note'
  | 'favorites';

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
      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
        active
          ? 'border-violet-glow/30 bg-violet-glow/15 text-violet-soft'
          : 'border-transparent text-white/40 hover:border-[rgba(255,255,255,0.07)] hover:bg-white/5 hover:text-white/70'
      }`}
    >
      {children}
    </button>
  );
}

export function Sidebar({
  active,
  onSelect,
  onGenerator,
}: {
  active: Category | 'generator';
  onSelect: (c: Category) => void;
  onGenerator: () => void;
}) {
  const version = typeof chrome !== 'undefined' && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest().version
    : '';

  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-[rgba(255,255,255,0.07)] bg-white/[0.035] py-3">
      {CATEGORIES.map(({ key, icon: Icon, title }) => (
        <RailButton key={key} active={active === key} title={title} onClick={() => onSelect(key)}>
          <Icon size={18} />
        </RailButton>
      ))}
      <div className="my-1 h-px w-6 bg-white/10" />
      <RailButton active={active === 'generator'} title="Generator" onClick={onGenerator}>
        <Wand size={18} />
      </RailButton>
      <div className="flex-1" />
      {version && (
        <span title={`Version ${version}`} className="select-none pb-0.5 text-[9px] text-white/25">
          v{version}
        </span>
      )}
    </nav>
  );
}
