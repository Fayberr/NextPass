import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { send } from './client.js';
import { Unlock } from './screens/Unlock.js';
import { Recovery } from './screens/Recovery.js';
import { VaultList } from './screens/VaultList.js';
import { ItemDetail } from './screens/ItemDetail.js';
import { AddLogin } from './screens/AddLogin.js';
import { AddTotp } from './screens/AddTotp.js';
import { AddSecret } from './screens/AddSecret.js';
import { AddIdentity } from './screens/AddIdentity.js';
import { AddCard } from './screens/AddCard.js';
import { AddNote } from './screens/AddNote.js';
import { Generator } from './screens/Generator.js';
import { Health } from './screens/Health.js';
import { Settings } from './screens/Settings.js';
import { Import } from './screens/Import.js';
import { AppShell, type AppShellProps } from './AppShell.js';
import type { Category } from './Sidebar.js';
import { getSettings } from '../lib/settings.js';
import { applyTheme } from '../lib/theme.js';
import type { VaultState } from '../lib/messages.js';
import type {
  LoginFields,
  TotpFields,
  SecretFields,
  AutofillIdentityFields,
  CardFields,
  NoteFields,
} from '@pm/shared';

type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'add' }
  | { name: 'edit'; id: string; initial: LoginFields }
  | { name: 'add_totp' }
  | { name: 'edit_totp'; id: string; initial: TotpFields }
  | { name: 'add_secret' }
  | { name: 'edit_secret'; id: string; initial: SecretFields }
  | { name: 'add_identity' }
  | { name: 'edit_identity'; id: string; initial: AutofillIdentityFields }
  | { name: 'add_card' }
  | { name: 'edit_card'; id: string; initial: CardFields }
  | { name: 'add_note' }
  | { name: 'edit_note'; id: string; initial: NoteFields }
  | { name: 'generator' }
  | { name: 'health' }
  | { name: 'settings' }
  | { name: 'import' };

/** Category -> the "add new item" view for that category (Passkeys/Favorites have none). */
const ADD_VIEW: Partial<Record<Category, View>> = {
  login: { name: 'add' },
  totp: { name: 'add_totp' },
  secret: { name: 'add_secret' },
  autofill_identity: { name: 'add_identity' },
  card: { name: 'add_card' },
  note: { name: 'add_note' },
};

const POPUP_STATE_KEY = 'pm_popup_active_state';

// Apply the persisted theme as early as possible (module load, before first paint settles).
// Runs in both the extension popup and the Electron desktop renderer (shared App).
if (typeof document !== 'undefined') {
  void getSettings()
    .then((s) => applyTheme(s.theme))
    .catch(() => applyTheme('dark'));
}

function savePopupState(v: View, c: Category) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      void chrome.storage.local.set({ [POPUP_STATE_KEY]: { view: v, category: c } });
    } else {
      localStorage.setItem(POPUP_STATE_KEY, JSON.stringify({ view: v, category: c }));
    }
  } catch {}
}

/**
 * `Shell` renders the persistent chrome (icon rail + top bar) around whatever screen is active.
 * Defaults to the Kaspersky-style popup shell; the desktop app passes its own bigger, more
 * spacious shell (see desktop/src/components/DesktopAppShell.tsx) since it has room a 360px
 * extension popup doesn't. Everything else here - state, routing, screens - stays identical.
 */
export function App({ Shell = AppShell }: { Shell?: (props: AppShellProps) => ReactElement } = {}) {
  const [state, setState] = useState<VaultState | null>(null);
  const [view, setView] = useState<View>({ name: 'list' });
  const [category, setCategory] = useState<Category>('login');
  const [q, setQ] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [counts, setCounts] = useState<Partial<Record<Category, number>>>({});

  function updateView(newView: View, newCat: Category = category) {
    setView(newView);
    savePopupState(newView, newCat);
  }

  function updateCategory(newCat: Category) {
    setCategory(newCat);
    updateView({ name: 'list' }, newCat);
  }

  async function refresh() {
    const res = await send({ kind: 'get_state' });
    if (res.ok && res.kind === 'state') setState(res.state);
  }

  useEffect(() => {
    void refresh();
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get([POPUP_STATE_KEY], (res) => {
        const saved = res?.[POPUP_STATE_KEY];
        if (saved?.category) setCategory(saved.category);
        if (saved?.view) setView(saved.view);
      });
    } else {
      try {
        const raw = localStorage.getItem(POPUP_STATE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.category) setCategory(saved.category);
          if (saved?.view) setView(saved.view);
        }
      } catch {}
    }
  }, []);

  // Keep per-category counts fresh for shells that show badges (desktop sidebar). Re-fetching
  // on every view change is cheap - list_items decrypts summaries already held in memory - and
  // covers all mutation paths, since add/edit/delete always navigate to another view after.
  useEffect(() => {
    if (!state?.unlocked) return;
    void (async () => {
      const res = await send({ kind: 'list_items' });
      if (res.ok && res.kind === 'items') {
        const next: Partial<Record<Category, number>> = {};
        for (const it of res.items) {
          const t = it.type as Category;
          next[t] = (next[t] ?? 0) + 1;
          if (it.favorite) next.favorites = (next.favorites ?? 0) + 1;
        }
        setCounts(next);
      }
    })();
  }, [state?.unlocked, view.name, reloadTick]);

  if (!state) {
    return <div className="p-6 text-center text-sm text-white/40">Loading…</div>;
  }

  // Highest priority: an unacknowledged recovery phrase must be shown (and can't be lost by
  // closing the popup) until the user confirms they saved it.
  if (state.pendingRecovery) {
    return (
      <Recovery
        phrase={state.pendingRecovery}
        identifier={state.identifier}
        onAcked={() => { void refresh(); updateView({ name: 'list' }); }}
      />
    );
  }

  if (!state.unlocked) {
    return <Unlock state={state} onUnlocked={(s) => { setState(s); }} />;
  }

  async function doSync() {
    setSyncing(true);
    await send({ kind: 'sync' });
    setReloadTick((t) => t + 1);
    setSyncing(false);
  }

  async function doLock() {
    await send({ kind: 'lock' });
    await refresh();
  }

  let content: ReactNode;
  switch (view.name) {
    case 'detail':
      content = (
        <ItemDetail
          id={view.id}
          onBack={() => updateView({ name: 'list' })}
          onEdit={(id, type, fields) => {
            switch (type) {
              case 'totp':
                updateView({ name: 'edit_totp', id, initial: fields as unknown as TotpFields });
                break;
              case 'secret':
                updateView({ name: 'edit_secret', id, initial: fields as unknown as SecretFields });
                break;
              case 'autofill_identity':
                updateView({
                  name: 'edit_identity',
                  id,
                  initial: fields as unknown as AutofillIdentityFields,
                });
                break;
              case 'card':
                updateView({ name: 'edit_card', id, initial: fields as unknown as CardFields });
                break;
              case 'note':
                updateView({ name: 'edit_note', id, initial: fields as unknown as NoteFields });
                break;
              default:
                updateView({ name: 'edit', id, initial: fields });
            }
          }}
          onDeleted={() => updateView({ name: 'list' })}
        />
      );
      break;
    case 'add':
      content = (
        <AddLogin onDone={() => updateView({ name: 'list' })} onCancel={() => updateView({ name: 'list' })} />
      );
      break;
    case 'add_totp':
      content = (
        <AddTotp onDone={() => updateView({ name: 'list' })} onCancel={() => updateView({ name: 'list' })} />
      );
      break;
    case 'edit_totp':
      content = (
        <AddTotp
          editId={view.id}
          initial={view.initial}
          onDone={() => updateView({ name: 'detail', id: view.id })}
          onCancel={() => updateView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'add_secret':
      content = (
        <AddSecret onDone={() => updateView({ name: 'list' })} onCancel={() => updateView({ name: 'list' })} />
      );
      break;
    case 'edit_secret':
      content = (
        <AddSecret
          editId={view.id}
          initial={view.initial}
          onDone={() => updateView({ name: 'detail', id: view.id })}
          onCancel={() => updateView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'add_identity':
      content = (
        <AddIdentity onDone={() => updateView({ name: 'list' })} onCancel={() => updateView({ name: 'list' })} />
      );
      break;
    case 'edit_identity':
      content = (
        <AddIdentity
          editId={view.id}
          initial={view.initial}
          onDone={() => updateView({ name: 'detail', id: view.id })}
          onCancel={() => updateView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'add_card':
      content = (
        <AddCard onDone={() => updateView({ name: 'list' })} onCancel={() => updateView({ name: 'list' })} />
      );
      break;
    case 'edit_card':
      content = (
        <AddCard
          editId={view.id}
          initial={view.initial}
          onDone={() => updateView({ name: 'detail', id: view.id })}
          onCancel={() => updateView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'add_note':
      content = (
        <AddNote onDone={() => updateView({ name: 'list' })} onCancel={() => updateView({ name: 'list' })} />
      );
      break;
    case 'edit_note':
      content = (
        <AddNote
          editId={view.id}
          initial={view.initial}
          onDone={() => updateView({ name: 'detail', id: view.id })}
          onCancel={() => updateView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'generator':
      content = <Generator onBack={() => updateView({ name: 'list' })} />;
      break;
    case 'health':
      content = (
        <Health
          onBack={() => updateView({ name: 'list' })}
          onSelect={(id) => updateView({ name: 'detail', id })}
        />
      );
      break;
    case 'settings':
      content = (
        <Settings
          onBack={() => updateView({ name: 'list' })}
          onImport={() => updateView({ name: 'import' })}
        />
      );
      break;
    case 'import':
      content = (
        <Import
          onDone={() => {
            updateView({ name: 'list' });
            setReloadTick((t) => t + 1);
          }}
          onCancel={() => updateView({ name: 'settings' })}
        />
      );
      break;
    case 'edit':
      content = (
        <AddLogin
          editId={view.id}
          initial={view.initial}
          onDone={() => updateView({ name: 'detail', id: view.id })}
          onCancel={() => updateView({ name: 'detail', id: view.id })}
        />
      );
      break;
    default:
      content = (
        <VaultList
          category={category}
          q={q}
          reloadKey={reloadTick}
          onSelect={(id) => updateView({ name: 'detail', id })}
          onAdd={() => updateView(ADD_VIEW[category] ?? { name: 'add' })}
        />
      );
  }

  return (
    <Shell
      active={
        view.name === 'generator' || view.name === 'health' || view.name === 'settings'
          ? view.name
          : category
      }
      onSelectCategory={updateCategory}
      onGenerator={() => updateView({ name: 'generator' })}
      counts={counts}
      search={view.name === 'list' ? { value: q, onChange: setQ } : undefined}
      onLock={doLock}
      onSync={doSync}
      syncing={syncing}
      onHealth={() => updateView({ name: 'health' })}
      onSettings={() => updateView({ name: 'settings' })}
    >
      {content}
    </Shell>
  );
}
