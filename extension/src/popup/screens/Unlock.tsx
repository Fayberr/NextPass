import { useState } from 'react';
import { Button, Card, Field, Input } from '../ui.js';
import { ShieldCheck, Copy, Check, Download } from '../icons.js';
import { send } from '../client.js';
import { DEFAULT_SERVER_URL } from '../../lib/config.js';
import type { VaultState } from '../../lib/messages.js';

/**
 * The unlock/onboarding hero screen — gets the most "marketing" polish per the design spec.
 * Modes: unlock (account exists, vault locked) | register | login (no account yet).
 */
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
  const [recovery, setRecovery] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);

  const configured = state.configured;

  function recoveryFileContent(phrase: string): string {
    const who = identifier || state.identifier || 'account';
    return [
      'Password Manager — Recovery Phrase',
      '===================================',
      '',
      `Account: ${who}`,
      `Created: ${new Date().toISOString()}`,
      '',
      'This 12-word phrase is the ONLY way to recover your vault if you',
      'forget your master password. Anyone with this phrase can decrypt',
      'your vault. Keep it offline and secret. It is shown once and is',
      'never stored on the server.',
      '',
      'Recovery phrase:',
      phrase,
      '',
    ].join('\n');
  }

  async function copyRecovery(phrase: string) {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  function downloadRecovery(phrase: string) {
    const blob = new Blob([recoveryFileContent(phrase)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const who = (identifier || state.identifier || 'account').replace(/[^a-z0-9._-]+/gi, '-');
    a.href = url;
    a.download = `pm-recovery-${who}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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
        if (res.recovery) {
          setRecovery(res.recovery);
          return; // show recovery phrase before entering the vault
        }
        onUnlocked(res.state);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (recovery) {
    return (
      <div className="p-5">
        <h1 className="mb-1 text-lg font-semibold">Save your recovery phrase</h1>
        <p className="mb-3 text-xs text-white/50">
          This 12-word phrase is the only way to recover your vault if you forget your master
          password. It is shown once and never stored. Write it down now.
        </p>
        <Card className="mb-4">
          <div className="grid grid-cols-3 gap-2 font-mono text-sm">
            {recovery.split(' ').map((w, i) => (
              <div key={i} className="rounded-lg bg-white/5 px-2 py-1">
                <span className="mr-1 text-white/30">{i + 1}</span>
                {w}
              </div>
            ))}
          </div>
        </Card>
        <div className="mb-3 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => copyRecovery(recovery)}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => downloadRecovery(recovery)}>
            <Download size={16} /> Download .txt
          </Button>
        </div>
        <Button className="w-full" onClick={() => send({ kind: 'get_state' }).then((r) => r.ok && r.kind === 'state' && onUnlocked(r.state))}>
          I've saved it — open my vault
        </Button>
      </div>
    );
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
