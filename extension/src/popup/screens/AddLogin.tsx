import { useEffect, useState } from 'react';
import { Button, Field, Input, Select } from '../ui.js';
import { ArrowLeft, Copy, Check, Eye, EyeOff, Wand } from '../icons.js';
import { send } from '../client.js';
import { copyWithClear } from '../clipboard.js';
import { generatePassword, isValidTotp, type LoginFields, type MatchMode } from '@pm/shared';

/**
 * Add OR edit a login. When `editId`/`initial` are provided it edits in place (update_login);
 * otherwise it creates a new item and prefills the website from the active tab.
 */
export function AddLogin({
  onDone,
  onCancel,
  editId,
  initial,
}: {
  onDone: () => void;
  onCancel: () => void;
  editId?: string;
  initial?: LoginFields;
}) {
  const editing = !!editId;
  const [name, setName] = useState(initial?.name ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [uri, setUri] = useState(initial?.uris?.[0] ?? '');
  const [matchMode, setMatchMode] = useState<MatchMode>(initial?.matchMode ?? 'host');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [totp, setTotp] = useState(initial?.totp ?? '');
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generator options.
  const [genOpen, setGenOpen] = useState(false);
  const [glen, setGlen] = useState(20);
  const [gSym, setGSym] = useState(true);
  const [gDig, setGDig] = useState(true);

  useEffect(() => {
    if (editing) return; // don't clobber the item's own website when editing
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.url && /^https?:/.test(tab.url)) {
        setUri(tab.url);
        try {
          setName(new URL(tab.url).hostname.replace(/^www\./, ''));
        } catch {
          /* ignore */
        }
      }
    });
  }, [editing]);

  function regen() {
    setPassword(generatePassword({ length: glen, symbols: gSym, digits: gDig }));
    setShowPw(true);
  }

  async function copyPw() {
    await copyWithClear(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const fields: LoginFields = {
      ...initial,
      name: name.trim() || uri || 'Untitled',
      username: username.trim() || undefined,
      email: email.trim() || undefined,
      password: password || undefined,
      uris: uri.trim() ? [uri.trim()] : [],
      matchMode,
      notes: notes.trim() || undefined,
      totp: totp.trim() || undefined,
    };
    const res = editing
      ? await send({ kind: 'update_login', id: editId!, fields })
      : await send({ kind: 'create_login', fields });
    setBusy(false);
    if (res.ok) onDone();
    else setError(res.error);
  }

  return (
    <div className="flex h-[500px] flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <Button variant="subtle" onClick={onCancel}>
          <ArrowLeft size={16} /> Cancel
        </Button>
        <span className="text-sm font-semibold">{editing ? 'Edit login' : 'New login'}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GitHub" />
        </Field>
        <Field label="Username">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>

        <Field label="Password">
          <div className="flex items-center gap-1.5">
            <Input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="font-mono"
            />
            <button
              onClick={() => setShowPw((s) => !s)}
              className="shrink-0 rounded-lg p-2 text-white/40 hover:text-white/80"
              title={showPw ? 'Hide' : 'Reveal'}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={copyPw}
              className="shrink-0 rounded-lg p-2 text-white/40 hover:text-white/80"
              title="Copy"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
            <button
              onClick={() => setGenOpen((o) => !o)}
              className="shrink-0 rounded-lg p-2 text-violet-soft hover:text-white"
              title="Generate password"
            >
              <Wand size={16} />
            </button>
          </div>

          {genOpen && (
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[11px] text-white/50">Length</span>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={glen}
                  onChange={(e) => setGlen(Number(e.target.value))}
                  className="flex-1 accent-violet-soft"
                />
                <span className="w-6 text-right text-xs tabular-nums text-white/80">{glen}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-white/60">
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={gDig}
                    onChange={(e) => setGDig(e.target.checked)}
                    className="accent-violet-soft"
                  />
                  0-9
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={gSym}
                    onChange={(e) => setGSym(e.target.checked)}
                    className="accent-violet-soft"
                  />
                  Symbols
                </label>
                <Button variant="ghost" className="ml-auto px-3 py-1 text-xs" onClick={regen}>
                  <Wand size={13} /> Generate
                </Button>
              </div>
            </div>
          )}
        </Field>

        <Field label="Website (URI)">
          <Input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Match mode">
          <Select<MatchMode>
            value={matchMode}
            onChange={setMatchMode}
            options={[
              { value: 'base_domain', label: 'Base domain', hint: 'Any subdomain of the site (recommended)' },
              { value: 'host', label: 'Host', hint: 'Only this exact subdomain' },
              { value: 'exact', label: 'Exact URL', hint: 'Only this full URL' },
              { value: 'never', label: 'Never', hint: "Don't autofill; suggest manually only" },
            ]}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
            Controls when this login is offered to autofill on a page.
          </p>
        </Field>

        <Field label="One-time code (TOTP)">
          <Input
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            autoComplete="off"
            placeholder="otpauth:// URI or secret key"
            className="font-mono"
          />
          {totp.trim() && !isValidTotp(totp.trim()) && (
            <p className="mt-1 text-[11px] text-amber-400">
              Doesn't look like a valid TOTP secret or otpauth URI.
            </p>
          )}
        </Field>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes…"
            className="w-full resize-none rounded-xl border border-white/10 bg-ink-700 px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/30"
          />
        </Field>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <footer className="border-t border-white/5 p-3">
        <Button className="w-full" onClick={save} disabled={busy || !password}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save login'}
        </Button>
      </footer>
    </div>
  );
}
