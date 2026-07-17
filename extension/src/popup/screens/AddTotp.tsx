import { useState } from 'react';
import { Button, Field, Input } from '../ui.js';
import { ArrowLeft } from '../icons.js';
import { send } from '../client.js';
import { isValidTotp, parseOtpauth, type TotpFields } from '@pm/shared';
import { TotpCode } from '../TotpCode.js';

/**
 * Add OR edit a standalone authenticator (TOTP) entry — a code not tied to a stored login,
 * like Google Authenticator. Accepts an otpauth:// URI (auto-fills name/issuer/account) or a
 * bare base32 secret.
 */
export function AddTotp({
  onDone,
  onCancel,
  editId,
  initial,
}: {
  onDone: () => void;
  onCancel: () => void;
  editId?: string;
  initial?: TotpFields;
}) {
  const editing = !!editId;
  const [name, setName] = useState(initial?.name ?? '');
  const [secret, setSecret] = useState(initial?.secret ?? '');
  const [issuer, setIssuer] = useState(initial?.issuer ?? '');
  const [account, setAccount] = useState(initial?.account ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidTotp(secret.trim());

  // When an otpauth URI is pasted, prefill issuer/account/name from it.
  function onSecret(v: string) {
    setSecret(v);
    if (/^otpauth:\/\//i.test(v.trim())) {
      try {
        const p = parseOtpauth(v.trim());
        if (p.issuer && !issuer) setIssuer(p.issuer);
        if (p.account && !account) setAccount(p.account);
        if (!name) setName(p.issuer ?? p.account ?? 'Authenticator');
      } catch {
        /* ignore parse errors while typing */
      }
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    const fields: TotpFields = {
      ...initial,
      name: name.trim() || issuer.trim() || account.trim() || 'Authenticator',
      secret: secret.trim(),
      issuer: issuer.trim() || undefined,
      account: account.trim() || undefined,
    };
    const res = editing
      ? await send({ kind: 'update_totp', id: editId!, fields })
      : await send({ kind: 'create_totp', fields });
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
        <span className="text-sm font-semibold">{editing ? 'Edit code' : 'New authenticator code'}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Secret / otpauth URI">
          <Input
            value={secret}
            onChange={(e) => onSecret(e.target.value)}
            autoComplete="off"
            placeholder="otpauth:// URI or base32 secret"
            className="font-mono"
          />
          {secret.trim() && !valid && (
            <p className="mt-1 text-[11px] text-amber-400">
              Doesn't look like a valid TOTP secret or otpauth URI.
            </p>
          )}
        </Field>

        {valid && (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <TotpCode secret={secret.trim()} label="Preview" />
          </div>
        )}

        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GitHub" />
        </Field>
        <Field label="Issuer">
          <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Account">
          <Input value={account} onChange={(e) => setAccount(e.target.value)} autoComplete="off" />
        </Field>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <footer className="border-t border-white/5 p-3">
        <Button className="w-full" onClick={save} disabled={busy || !valid}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save code'}
        </Button>
      </footer>
    </div>
  );
}
