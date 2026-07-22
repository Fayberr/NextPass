import { useState } from 'react';
import { Button, Field, Input, Textarea } from '../ui.js';
import { ArrowLeft, Copy, Check, Eye, EyeOff } from '../icons.js';
import { send } from '../client.js';
import { copyWithClear } from '../clipboard.js';
import type { SecretFields } from '@pm/shared';

/**
 * Add OR edit a designated API key / secret — a flexible name+value pair for API keys, SSH
 * keys, license codes, Wi-Fi passwords, etc. No autofill/matching semantics (unlike logins).
 */
export function AddSecret({
  onDone,
  onCancel,
  editId,
  initial,
}: {
  onDone: () => void;
  onCancel: () => void;
  editId?: string;
  initial?: SecretFields;
}) {
  const editing = !!editId;
  const [name, setName] = useState(initial?.name ?? '');
  const [value, setValue] = useState(initial?.value ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [showValue, setShowValue] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyValue() {
    await copyWithClear(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const fields: SecretFields = {
      ...initial,
      name: name.trim() || 'Untitled secret',
      value,
      notes: notes.trim() || undefined,
    };
    const res = editing
      ? await send({ kind: 'update_secret', id: editId!, fields })
      : await send({ kind: 'create_secret', fields });
    setBusy(false);
    if (res.ok) onDone();
    else setError(res.error);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <Button variant="subtle" onClick={onCancel}>
          <ArrowLeft size={16} /> Cancel
        </Button>
        <span className="text-sm font-semibold">{editing ? 'Edit secret' : 'New API key / secret'}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stripe API key" />
        </Field>

        <Field label="Value">
          <div className="flex items-center gap-1.5">
            <Input
              type={showValue ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
              className="font-mono"
            />
            <button
              onClick={() => setShowValue((s) => !s)}
              className="shrink-0 rounded-lg p-2 text-white/40 hover:text-white/80"
              title={showValue ? 'Hide' : 'Reveal'}
            >
              {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={copyValue}
              className="shrink-0 rounded-lg p-2 text-white/40 hover:text-white/80"
              title="Copy"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>
        </Field>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes…"
          />
        </Field>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <footer className="border-t border-white/5 p-3">
        <Button className="w-full" onClick={save} disabled={busy || !value}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save secret'}
        </Button>
      </footer>
    </div>
  );
}
