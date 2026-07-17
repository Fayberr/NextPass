import { useEffect, useState } from 'react';
import { Button, Field, Input } from '../ui.js';
import { ArrowLeft } from '../icons.js';
import { send } from '../client.js';
import type { LoginFields, MatchMode } from '@pm/shared';

/** Minimal "add login" form. Prefills the website from the active tab. */
export function AddLogin({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uri, setUri] = useState('');
  const [matchMode, setMatchMode] = useState<MatchMode>('host');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    const fields: LoginFields = {
      name: name.trim() || uri || 'Untitled',
      username: username.trim() || undefined,
      email: email.trim() || undefined,
      password: password || undefined,
      uris: uri.trim() ? [uri.trim()] : [],
      matchMode,
    };
    const res = await send({ kind: 'create_login', fields });
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
        <span className="text-sm font-semibold">New login</span>
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
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Website (URI)">
          <Input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Match mode">
          <select
            value={matchMode}
            onChange={(e) => setMatchMode(e.target.value as MatchMode)}
            className="w-full rounded-xl border border-white/10 bg-ink-700 px-3 py-2 text-sm text-white/90 outline-none"
          >
            <option value="host">Host (this subdomain)</option>
            <option value="base_domain">Base domain (all subdomains)</option>
            <option value="exact">Exact URL</option>
            <option value="never">Never autofill</option>
          </select>
        </Field>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <footer className="border-t border-white/5 p-3">
        <Button className="w-full" onClick={save} disabled={busy || !password}>
          {busy ? 'Saving…' : 'Save login'}
        </Button>
      </footer>
    </div>
  );
}
