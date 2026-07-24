import { useEffect, useRef, useState } from 'react';
import { Button, Card, Field, Input } from '../ui.js';
import { ShieldCheck, AlertTriangle, GoogleIcon, Fingerprint } from '../icons.js';
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
  const [googleAuthAccount, setGoogleAuthAccount] = useState<{ email: string; existingUser: boolean } | null>(null);
  const [pendingGoogleLink, setPendingGoogleLink] = useState<{ googleId: string; googleEmail: string } | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  const configured = state.configured;

  // Restore the saved draft on mount (before enabling persistence, so we don't clobber it).
  useEffect(() => {
    async function loadDraft() {
      try {
        let d: Draft | undefined;
        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          const v = await chrome.storage.session.get(DRAFT_KEY);
          d = v[DRAFT_KEY] as Draft | undefined;
        } else {
          const raw = sessionStorage.getItem(DRAFT_KEY);
          if (raw) d = JSON.parse(raw);
        }
        if (d) {
          setMode(d.mode);
          if (d.identifier) setIdentifier(d.identifier);
          if (d.serverUrl) setServerUrl(d.serverUrl);
          setShowAdvanced(d.showAdvanced);
        }
      } catch {}
      loaded.current = true;
    }
    void loadDraft();
  }, []);

  // Persist the draft as the user types (never the password).
  useEffect(() => {
    if (!loaded.current) return;
    const draft: Draft = { mode, identifier, serverUrl, showAdvanced };
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      void chrome.storage.session.set({ [DRAFT_KEY]: draft });
    } else {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {}
    }
  }, [mode, identifier, serverUrl, showAdvanced]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let res;
      if (configured && (!identifier || identifier.toLowerCase() === (state.identifier ?? '').toLowerCase())) {
        res = await send({ kind: 'unlock', password });
      } else if (mode === 'register') {
        res = await send({ kind: 'register', serverUrl, identifier, password });
      } else {
        res = await send({ kind: 'login', serverUrl, identifier, password });
      }
      if (!res.ok) throw new Error(res.error);
      if (res.kind === 'state') {
        if (pendingGoogleLink) {
          try {
            await send({
              kind: 'link_google',
              googleId: pendingGoogleLink.googleId,
              googleEmail: pendingGoogleLink.googleEmail,
            });
          } catch {
            // Ignore if linking fails or already linked
          }
        }
        // Successful submit - clear the saved draft.
        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          await chrome.storage.session.remove(DRAFT_KEY);
        } else {
          try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
        }
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
      // Runs the interactive account chooser in the background service worker (not here in the
      // popup) - see the 'google_signin' case in background/index.ts for why.
      const gRes = await send({ kind: 'google_signin' });
      if (!gRes.ok) throw new Error(gRes.error);
      const googleUser = gRes.kind === 'google_user' ? gRes.googleUser : null;
      if (!googleUser) {
        setBusy(false);
        return;
      }

      // If this device was previously remembered (Settings → "Enable Google auth only login"),
      // a fresh Google sign-in alone fully unlocks the vault - no master password needed.
      if (configured && state.deviceUnlockAvailable) {
        const res = await send({ kind: 'device_unlock', serverUrl, googleUser });
        if (!res.ok) throw new Error(res.error);
        if (res.kind === 'state') {
          if (typeof chrome !== 'undefined' && chrome.storage?.session) {
            await chrome.storage.session.remove(DRAFT_KEY);
          } else {
            try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
          }
          onUnlocked(res.state);
        }
        return;
      }

      // Fallback (device-unlock not enabled/available): Google identifies & verifies the account,
      // then prompts for the master password on a dedicated focused password screen.
      const res = await send({
        kind: 'google_auth',
        serverUrl,
        googleUser,
      });

      if (!res.ok) throw new Error(res.error);
      if (res.kind === 'google_auth_result') {
        const info = res.res;
        const idToShow = info.identifier || googleUser.email;
        if (info.identifier) setIdentifier(info.identifier);

        setPendingGoogleLink({
          googleId: googleUser.googleId,
          googleEmail: googleUser.email,
        });

        if (info.existingUser) {
          setMode('login');
        } else {
          setMode('register');
        }

        setGoogleAuthAccount({
          email: idToShow,
          existingUser: info.existingUser,
        });

        setTimeout(() => passwordInputRef.current?.focus(), 50);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  /** Desktop app only (helloUnlockAvailable is never set in the browser popup): pass a live
   *  Windows Hello PIN/biometric check, and the main process releases the stored vault key. */
  async function handleHelloUnlock() {
    setBusy(true);
    setError(null);
    try {
      const res = await send({ kind: 'hello_unlock' });
      if (!res.ok) throw new Error(res.error);
      if (res.kind === 'state') {
        if (typeof chrome !== 'undefined' && chrome.storage?.session) {
          await chrome.storage.session.remove(DRAFT_KEY);
        } else {
          try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
        }
        onUnlocked(res.state);
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
    <div className="flex h-full w-full items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md my-auto">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-glow to-indigo-500 text-[#fff] shadow-glass">
          <ShieldCheck size={28} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">NextPass</h1>
        <p className="mt-1 text-xs text-white/40">
          {showRecoveryMode
            ? 'Vault Recovery - 12-Word Phrase'
            : googleAuthAccount
            ? 'Enter master password to continue'
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
        ) : googleAuthAccount ? (
          <div className="space-y-3">
            <div className="mb-2 text-xs text-white/40">
              Logging into account <span className="font-medium text-white/70">{googleAuthAccount.email}</span>
            </div>

            <Field label="Master password">
              <Input
                ref={passwordInputRef}
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

            <Button className="w-full" onClick={submit} disabled={busy || !password}>
              {busy
                ? 'Working…'
                : configured && (!identifier || identifier.toLowerCase() === (state.identifier ?? '').toLowerCase())
                ? 'Unlock'
                : googleAuthAccount.existingUser
                ? 'Log in'
                : 'Create vault'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setGoogleAuthAccount(null);
                setError(null);
              }}
              className="mt-3 block w-full text-center text-xs text-white/30 hover:text-white/60"
            >
              Use a different account
            </button>
          </div>
        ) : (
          <>
            {configured && state.helloUnlockAvailable && (
              <button
                type="button"
                onClick={handleHelloUnlock}
                disabled={busy}
                className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-xl border border-violet-400/25 bg-violet-500/10 py-2.5 text-xs font-medium text-white transition hover:border-violet-400/40 hover:bg-violet-500/15 active:scale-[0.99]"
              >
                <Fingerprint size={16} className="text-violet-300" />
                <span>Unlock with Windows Hello</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={busy}
              className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/10 active:scale-[0.99]"
            >
              <GoogleIcon />
              <span>
                {configured && state.deviceUnlockAvailable
                  ? `Continue with Google (${state.googleEmail || state.identifier})`
                  : configured && state.googleEmail
                  ? `Sign in with Google (${state.googleEmail})`
                  : 'Sign in with Google'}
              </span>
            </button>

            <div className="mb-3 flex items-center gap-2 text-[10px] text-white/25 font-semibold tracking-wider">
              <div className="h-px flex-1 bg-white/10" />
              <span>OR</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {!configured && (
              <div className="mb-4 flex rounded-xl bg-white/[0.04] p-1 text-xs border border-white/[0.08]">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                      mode === m
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-[#fff] shadow-md shadow-violet-600/30'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {m === 'login' ? 'Log in' : 'Register'}
                  </button>
                ))}
              </div>
            )}

            {!configured && (
              <Field label="Email or username">
                <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
              </Field>
            )}

            <Field label="Master password">
              <Input
                ref={passwordInputRef}
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
  </div>
  );
}
