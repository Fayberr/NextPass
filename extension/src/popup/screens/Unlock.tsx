import { useEffect, useRef, useState } from 'react';
import { Button, Card, Field, Input } from '../ui.js';
import { ShieldCheck, AlertTriangle, GoogleIcon } from '../icons.js';
import { send } from '../client.js';
import { DEFAULT_SERVER_URL } from '../../lib/config.js';
import type { VaultState } from '../../lib/messages.js';
import { promptGoogleAuth } from '../../lib/google-auth.js';

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
        // Successful submit - clear the saved draft. (If registering, App now routes to the
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

  async function handleGoogleAuth() {
    setBusy(true);
    setError(null);
    try {
      const googleUser = await promptGoogleAuth();
      if (!googleUser) {
        setBusy(false);
        return;
      }

      // If this device was previously remembered (Settings → "Enable Google auth only login"),
      // a fresh Google sign-in alone fully unlocks the vault - no master password needed. The
      // background still verifies server-side that this Google account is the one linked to
      // this vault before it will actually use the cached device key (see session.ts
      // unlockWithDevice()).
      if (configured && state.deviceUnlockAvailable) {
        const res = await send({ kind: 'device_unlock', serverUrl, googleUser });
        if (!res.ok) throw new Error(res.error);
        if (res.kind === 'state') {
          await chrome.storage.session.remove(DRAFT_KEY);
          onUnlocked(res.state);
        }
        return;
      }

      // Fallback (device-unlock not enabled/available): Google only identifies the account and
      // prefills the identifier - the master password below is still required to actually unlock.
      const res = await send({
        kind: 'google_auth',
        serverUrl,
        googleUser,
      });

      if (!res.ok) throw new Error(res.error);
      if (res.kind === 'google_auth_result') {
        const info = res.res;
        if (info.identifier) setIdentifier(info.identifier);
        if (info.existingUser) {
          setMode('login');
        } else {
          setMode('register');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const [showRecoveryMode, setShowRecoveryMode] = useState(false);
  const [recoveryMnemonic, setRecoveryMnemonic] = useState('');
  const [newMasterPw, setNewMasterPw] = useState('');
  const [confirmNewMasterPw, setConfirmNewMasterPw] = useState('');

  async function handleRecoverySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const words = recoveryMnemonic.trim().split(/\s+/);
    if (words.length !== 12) {
      setError('Please enter all 12 words of your recovery phrase.');
      return;
    }
    if (newMasterPw.length < 8) {
      setError('New master password must be at least 8 characters.');
      return;
    }
    if (newMasterPw !== confirmNewMasterPw) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const res = await send({
        kind: 'recover_account',
        mnemonic: recoveryMnemonic.trim(),
        newPassword: newMasterPw,
      });

      if (!res.ok) {
        setError(res.error || 'Failed to recover vault.');
      } else if (res.kind === 'state') {
        onUnlocked(res.state);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
        <h1 className="text-xl font-semibold tracking-tight">NextPass</h1>
        <p className="mt-1 text-xs text-white/40">
          {showRecoveryMode
            ? 'Vault Recovery - 12-Word Phrase'
            : configured
            ? 'Enter your master password to unlock'
            : 'The next Generation Password Manager'}
        </p>
      </div>

      <Card>
        {showRecoveryMode ? (
          <form onSubmit={handleRecoverySubmit} className="space-y-3">
            <Field label="12-Word Recovery Phrase">
              <textarea
                value={recoveryMnemonic}
                onChange={(e) => setRecoveryMnemonic(e.target.value)}
                placeholder="word1 word2 word3 ..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs text-white placeholder:text-white/20 focus:border-violet-500 focus:outline-none"
                required
              />
            </Field>

            <Field label="New Master Password">
              <Input
                type="password"
                value={newMasterPw}
                onChange={(e) => setNewMasterPw(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </Field>

            <Field label="Confirm New Password">
              <Input
                type="password"
                value={confirmNewMasterPw}
                onChange={(e) => setConfirmNewMasterPw(e.target.value)}
                placeholder="••••••••••••"
                required
              />
            </Field>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button type="submit" variant="primary" className="w-full" disabled={busy}>
              {busy ? 'Recovering...' : 'Recover Vault & Reset Password'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowRecoveryMode(false);
                setError(null);
              }}
              className="mt-2 block w-full text-center text-xs text-white/40 hover:text-white/70"
            >
              Cancel & return to unlock
            </button>
          </form>
        ) : (
          <>
            {configured && state.googleEmail && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={busy}
                  className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
                >
                  <GoogleIcon />
                  <span>
                    {state.deviceUnlockAvailable
                      ? `Continue with Google (${state.googleEmail})`
                      : `Sign in with Google (${state.googleEmail})`}
                  </span>
                </button>
                {!state.deviceUnlockAvailable && (
                  <p className="mb-3 -mt-2 text-center text-[10px] text-white/25">
                    Master password still required - enable "Google auth only login" in Settings
                    to skip it on this device.
                  </p>
                )}

                <div className="mb-3 flex items-center gap-2 text-[10px] text-white/25 font-semibold tracking-wider">
                  <div className="h-px flex-1 bg-white/10" />
                  <span>OR</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              </>
            )}

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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoFocus
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
                <AlertTriangle size={14} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

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
              <div className="mt-3 flex items-center justify-between text-xs text-white/30">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecoveryMode(true);
                    setError(null);
                  }}
                  className="hover:text-violet-300 hover:underline"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => send({ kind: 'forget' }).then((r) => r.ok && r.kind === 'state' && onUnlocked(r.state))}
                  className="hover:text-white/60 hover:underline"
                >
                  Use a different account
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
