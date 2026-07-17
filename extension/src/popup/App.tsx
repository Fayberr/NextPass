import { useEffect, useState } from 'react';
import { send } from './client.js';
import { Unlock } from './screens/Unlock.js';
import { VaultList } from './screens/VaultList.js';
import { ItemDetail } from './screens/ItemDetail.js';
import { AddLogin } from './screens/AddLogin.js';
import type { VaultState } from '../lib/messages.js';

type View = { name: 'list' } | { name: 'detail'; id: string } | { name: 'add' };

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

  if (!state.unlocked) {
    return <Unlock state={state} onUnlocked={(s) => { setState(s); setView({ name: 'list' }); }} />;
  }

  switch (view.name) {
    case 'detail':
      return <ItemDetail id={view.id} onBack={() => setView({ name: 'list' })} />;
    case 'add':
      return <AddLogin onDone={() => setView({ name: 'list' })} onCancel={() => setView({ name: 'list' })} />;
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
