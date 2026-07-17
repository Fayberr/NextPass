import { useEffect, useRef, useState } from 'react';
import { Button, Card, Field, Input } from '../ui.js';
import { ShieldCheck } from '../icons.js';
import { send } from '../client.js';
import { DEFAULT_SERVER_URL } from '../../lib/config.js';
import type { VaultState } from '../../lib/messages.js';

/**
 * The unlock/onboarding hero screen. Modes: unlock (account exists, vault locked) |
 * register | login (no account yet).
 *
 * The typed-but-not-submitted form (mode, identifier, server URL, advanced toggle) is persisted
 * to chrome.storage.session so it survives the popup being closed/reopened. The password is never
 * persisted. The one-time recovery phrase is handled by the background + <Recovery> screen.
 */
const DRAFT_KEY = 'unlockDraft';

interface Draft {
  mode: 'register' | 'login';
  identifier: string;
  serverUrl: string;
  showAdvanced: boolean;
}

export function Unlock({
  state,
  onUnlocked,
}: {
  state: VaultState;
  onUnlocked: (s: VaultState) => void;
}) {
  const [mode, setMode] = useState<'register' | 'login'>('login');
  const [serverUrl, setServerUrl] = useState(state.serverUrl || DEFAULT_SERVER_URL);
  const [identifier, setIdentifier] = useState(state.identifier ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const loaded = useRef(false);

  const configured = state.configured;

  // Restore the saved draft on mount (before enabling persistence, so we don't clobber it).
  useEffect(() => {
    chrome.storage.session.get(DRAFT_KEY).then((v) => {
      const d = v[DRAFT_KEY] as Draft | undefined;
      if (d) {
        setMode(d.mode);
        if (d.identifier) setIdentifier(d.identifier);
        if (d.serverUrl) setServerUrl(d.serverUrl);
        setShowAdvanced(d.showAdvanced);
      }
      loaded.current = true;
    });
  }, []);

  // Persist the draft as the user types (never the password).
  useEffect(() => {
    if (!loaded.current) return;
    const draft: Draft = { mode, identifier, serverUrl, showAdvanced };
    void chrome.storage.session.set({ [DRAFT_KEY]: draft });
  }, [mode, identifier, serverUrl, showAdvanced]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let res;
      if (configured) {
        res = await send({ kind: 'unlock', password });
      } else if (mode === 'register') {
        res = await send({ kind: 'register', serverUrl, identifier, password });
      } else {
        res = await send({ kind: 'login', serverUrl, identifier, password });
      }
      if (!res.ok) throw new Error(res.error);
      if (res.kind === 'state') {
        // Successful submit — clear the saved draft. (If registering, App now routes to the
        // recovery screen because res.state.pendingRecovery is set.)
        await chrome.storage.session.remove(DRAFT_KEY);
        onUnlocked(res.state);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[500px] flex-col justify-center p-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-glow to-indigo-500 text-white shadow-glass">
          <ShieldCheck size={28} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Password Manager</h1>
        <p className="mt-1 text-xs text-white/40">
          {configured ? 'Enter your master password to unlock' : 'Supercharge your secrets'}
        </p>
      </div>

      <Card>
        {!configured && (
          <div className="mb-3 flex rounded-full bg-white/5 p-1 text-xs">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-1.5 font-medium transition ${
                  mode === m ? 'bg-violet-glow text-white' : 'text-white/50'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Register'}
              </button>
            ))}
          </div>
        )}

        {!configured && (
          <>
            <Field label="Email or username">
              <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
            </Field>
            {showAdvanced && (
              <Field label="Server URL">
                <Input
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:8787"
                />
              </Field>
            )}
          </>
        )}

        <Field label="Master password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoFocus
            autoComplete="current-password"
          />
        </Field>

        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

        <Button className="w-full" onClick={submit} disabled={busy || !password || (!configured && !identifier)}>
          {busy ? 'Working…' : configured ? 'Unlock' : mode === 'register' ? 'Create vault' : 'Log in'}
        </Button>

        {!configured && (
          <button
            onClick={() => setShowAdvanced((s) => !s)}
            className="mt-3 block w-full text-center text-xs text-white/25 hover:text-white/50"
          >
            {showAdvanced ? 'Hide advanced' : 'Advanced'}
          </button>
        )}

        {configured && (
          <button
            onClick={() => send({ kind: 'forget' }).then((r) => r.ok && r.kind === 'state' && onUnlocked(r.state))}
            className="mt-3 block w-full text-center text-xs text-white/30 hover:text-white/50"
          >
            Use a different account
          </button>
        )}
      </Card>
    </div>
  );
}
