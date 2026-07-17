import { useEffect, useState } from 'react';
import { send } from './client.js';
import { Unlock } from './screens/Unlock.js';
import { Recovery } from './screens/Recovery.js';
import { VaultList } from './screens/VaultList.js';
import { ItemDetail } from './screens/ItemDetail.js';
import { AddLogin } from './screens/AddLogin.js';
import type { VaultState } from '../lib/messages.js';
import type { LoginFields } from '@pm/shared';

type View =
  | { name: 'list' }
  | { name: 'detail'; id: string }
  | { name: 'add' }
  | { name: 'edit'; id: string; initial: LoginFields };

export function App() {
  const [state, setState] = useState<VaultState | null>(null);
  const [view, setView] = useState<View>({ name: 'list' });

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

  switch (view.name) {
    case 'detail':
      return (
        <ItemDetail
          id={view.id}
          onBack={() => setView({ name: 'list' })}
          onEdit={(id, initial) => setView({ name: 'edit', id, initial })}
          onDeleted={() => setView({ name: 'list' })}
        />
      );
    case 'add':
      return <AddLogin onDone={() => setView({ name: 'list' })} onCancel={() => setView({ name: 'list' })} />;
    case 'edit':
      return (
        <AddLogin
          editId={view.id}
          initial={view.initial}
          onDone={() => setView({ name: 'detail', id: view.id })}
          onCancel={() => setView({ name: 'detail', id: view.id })}
        />
      );
    default:
      return (
        <VaultList
          onSelect={(id) => setView({ name: 'detail', id })}
          onAdd={() => setView({ name: 'add' })}
          onLock={async () => {
            await send({ kind: 'lock' });
            await refresh();
          }}
        />
      );
  }
}
