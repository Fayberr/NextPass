import { useState } from 'react';
import { Button, Field, Input } from '../ui.js';
import { ArrowLeft, Eye, EyeOff } from '../icons.js';
import { send } from '../client.js';
import type { CardFields } from '@pm/shared';

/** Add OR edit a bank card. Storage + manual copy only - real checkout autofill is capped by
 *  cross-origin payment iframes (Stripe/Adyen/PayPal) a content script can't reach into, so
 *  this is intentionally scoped to "store it, view/copy fields" for now. */
export function AddCard({
  onDone,
  onCancel,
  editId,
  initial,
}: {
  onDone: () => void;
  onCancel: () => void;
  editId?: string;
  initial?: CardFields;
}) {
  const editing = !!editId;
  const [name, setName] = useState(initial?.name ?? '');
  const [cardholder, setCardholder] = useState(initial?.cardholder ?? '');
  const [number, setNumber] = useState(initial?.number ?? '');
  const [expMonth, setExpMonth] = useState(initial?.expMonth ?? '');
  const [expYear, setExpYear] = useState(initial?.expYear ?? '');
  const [cvv, setCvv] = useState(initial?.cvv ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [showNumber, setShowNumber] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const fields: CardFields = {
      ...initial,
      name: name.trim() || cardholder.trim() || 'Untitled card',
      cardholder: cardholder.trim() || undefined,
      number: number.trim() || undefined,
      expMonth: expMonth.trim() || undefined,
      expYear: expYear.trim() || undefined,
      cvv: cvv.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const res = editing
      ? await send({ kind: 'update_card', id: editId!, fields })
      : await send({ kind: 'create_card', fields });
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
        <span className="text-sm font-semibold">{editing ? 'Edit card' : 'New bank card'}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Personal Visa" />
        </Field>
        <Field label="Cardholder">
          <Input value={cardholder} onChange={(e) => setCardholder(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Card number">
          <div className="flex items-center gap-1.5">
            <Input
              type={showNumber ? 'text' : 'password'}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoComplete="off"
              inputMode="numeric"
              className="font-mono"
            />
            <button
              onClick={() => setShowNumber((s) => !s)}
              className="shrink-0 rounded-lg p-2 text-white/40 hover:text-white/80"
              title={showNumber ? 'Hide' : 'Reveal'}
            >
              {showNumber ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Exp. month">
            <Input value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="MM" />
          </Field>
          <Field label="Exp. year">
            <Input value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="YYYY" />
          </Field>
          <Field label="CVV">
            <div className="flex items-center gap-1.5">
              <Input
                type={showCvv ? 'text' : 'password'}
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                autoComplete="off"
                inputMode="numeric"
                className="font-mono"
              />
              <button
                onClick={() => setShowCvv((s) => !s)}
                className="shrink-0 rounded-lg p-2 text-white/40 hover:text-white/80"
                title={showCvv ? 'Hide' : 'Reveal'}
              >
                {showCvv ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
        </div>

        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" />
        </Field>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <footer className="border-t border-white/5 p-3">
        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save card'}
        </Button>
      </footer>
    </div>
  );
}
