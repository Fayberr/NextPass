import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
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
import { AppShell } from './AppShell.js';
import type { Category } from './Sidebar.js';
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

export function App() {
  const [state, setState] = useState<VaultState | null>(null);
  const [view, setView] = useState<View>({ name: 'list' });
  const [category, setCategory] = useState<Category>('login');
  const [q, setQ] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  async function refresh() {
    const res = await send({ kind: 'get_state' });
    if (res.ok && res.kind === 'state') setState(res.state);
  }

  useEffect(() => {
    void refresh();
  }, []);

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
        onAcked={() => { void refresh(); setView({ name: 'list' }); }}
      />
    );
  }

  if (!state.unlocked) {
    return <Unlock state={state} onUnlocked={(s) => { setState(s); setView({ name: 'list' }); }} />;
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

  function selectCategory(c: Category) {
    setCategory(c);
    setView({ name: 'list' });
  }

  let content: ReactNode;
  switch (view.name) {
    case 'detail':
      content = (
        <ItemDetail
          id={view.id}
          onBack={() => setView({ name: 'list' })}
          onEdit={(id, type, fields) => {
            switch (type) {
              case 'totp':
                setView({ name: 'edit_totp', id, initial: fields as unknown as TotpFields });
                break;
              case 'secret':
                setView({ name: 'edit_secret', id, initial: fields as unknown as SecretFields });
                break;
              case 'autofill_identity':
                setView({
                  name: 'edit_identity',
                  id,
                  initial: fields as unknown as AutofillIdentityFields,
                });
                break;
              case 'card':
                setView({ name: 'edit_card', id, initial: fields as unknown as CardFields });
                break;
              case 'note':
                setView({ name: 'edit_note', id, initial: fields as unknown as NoteFields });
                break;
              default:
                setView({ name: 'edit', id, initial: fields });
            }
          }}
          onDeleted={() => setView({ name: 'list' })}
        />
      );
      break;
    case 'add':
      content = (
        <AddLogin onDone={() => setView({ name: 'list' })} onCancel={() => setView({ name: 'list' })} />
      );
      break;
    case 'add_totp':
      content = (
        <AddTotp onDone={() => setView({ name: 'list' })} onCancel={() => setView({ name: 'list' })} />
      );
      break;
    case 'edit_totp':
      content = (
        <AddTotp
          editId={view.id}
          initial={view.initial}
          onDone={() => setView({ name: 'detail', id: view.id })}
          onCancel={() => setView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'add_secret':
      content = (
        <AddSecret onDone={() => setView({ name: 'list' })} onCancel={() => setView({ name: 'list' })} />
      );
      break;
    case 'edit_secret':
      content = (
        <AddSecret
          editId={view.id}
          initial={view.initial}
          onDone={() => setView({ name: 'detail', id: view.id })}
          onCancel={() => setView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'add_identity':
      content = (
        <AddIdentity onDone={() => setView({ name: 'list' })} onCancel={() => setView({ name: 'list' })} />
      );
      break;
    case 'edit_identity':
      content = (
        <AddIdentity
          editId={view.id}
          initial={view.initial}
          onDone={() => setView({ name: 'detail', id: view.id })}
          onCancel={() => setView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'add_card':
      content = (
        <AddCard onDone={() => setView({ name: 'list' })} onCancel={() => setView({ name: 'list' })} />
      );
      break;
    case 'edit_card':
      content = (
        <AddCard
          editId={view.id}
          initial={view.initial}
          onDone={() => setView({ name: 'detail', id: view.id })}
          onCancel={() => setView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'add_note':
      content = (
        <AddNote onDone={() => setView({ name: 'list' })} onCancel={() => setView({ name: 'list' })} />
      );
      break;
    case 'edit_note':
      content = (
        <AddNote
          editId={view.id}
          initial={view.initial}
          onDone={() => setView({ name: 'detail', id: view.id })}
          onCancel={() => setView({ name: 'detail', id: view.id })}
        />
      );
      break;
    case 'generator':
      content = <Generator onBack={() => setView({ name: 'list' })} />;
      break;
    case 'health':
      content = (
        <Health
          onBack={() => setView({ name: 'list' })}
          onSelect={(id) => setView({ name: 'detail', id })}
        />
      );
      break;
    case 'settings':
      content = <Settings onBack={() => setView({ name: 'list' })} />;
      break;
    case 'import':
      content = (
        <Import
          onDone={() => {
            setView({ name: 'list' });
            setReloadTick((t) => t + 1);
          }}
          onCancel={() => setView({ name: 'list' })}
        />
      );
      break;
    case 'edit':
      content = (
        <AddLogin
          editId={view.id}
          initial={view.initial}
          onDone={() => setView({ name: 'detail', id: view.id })}
          onCancel={() => setView({ name: 'detail', id: view.id })}
        />
      );
      break;
    default:
      content = (
        <VaultList
          category={category}
          q={q}
          reloadKey={reloadTick}
          onSelect={(id) => setView({ name: 'detail', id })}
          onAdd={() => setView(ADD_VIEW[category] ?? { name: 'add' })}
        />
      );
  }

  return (
    <AppShell
      active={view.name === 'generator' ? 'generator' : category}
      onSelectCategory={selectCategory}
      onGenerator={() => setView({ name: 'generator' })}
      search={view.name === 'list' ? { value: q, onChange: setQ } : undefined}
      onLock={doLock}
      onSync={doSync}
      syncing={syncing}
      onHealth={() => setView({ name: 'health' })}
      onSettings={() => setView({ name: 'settings' })}
      onImport={() => setView({ name: 'import' })}
    >
      {content}
    </AppShell>
  );
}
