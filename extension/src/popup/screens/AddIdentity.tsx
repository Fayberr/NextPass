import { useState } from 'react';
import { Button, Field, Input } from '../ui.js';
import { ArrowLeft } from '../icons.js';
import { send } from '../client.js';
import type { AutofillIdentityFields } from '@pm/shared';

/** Add OR edit an identity: name/contact/address, for shipping/billing forms (storage + manual
 *  copy only for now - form-autofill matching isn't wired up yet, unlike logins). */
export function AddIdentity({
  onDone,
  onCancel,
  editId,
  initial,
}: {
  onDone: () => void;
  onCancel: () => void;
  editId?: string;
  initial?: AutofillIdentityFields;
}) {
  const editing = !!editId;
  const [name, setName] = useState(initial?.name ?? '');
  const [firstName, setFirstName] = useState(initial?.firstName ?? '');
  const [lastName, setLastName] = useState(initial?.lastName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [address1, setAddress1] = useState(initial?.address1 ?? '');
  const [address2, setAddress2] = useState(initial?.address2 ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [state, setState] = useState(initial?.state ?? '');
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const fields: AutofillIdentityFields = {
      ...initial,
      name: name.trim() || [firstName, lastName].filter(Boolean).join(' ').trim() || 'Untitled identity',
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address1: address1.trim() || undefined,
      address2: address2.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || undefined,
    };
    const res = editing
      ? await send({ kind: 'update_identity', id: editId!, fields })
      : await send({ kind: 'create_identity', fields });
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
        <span className="text-sm font-semibold">{editing ? 'Edit identity' : 'New identity'}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Label">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home address" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="First name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <Field label="Email">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Address line 1">
          <Input value={address1} onChange={(e) => setAddress1(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Address line 2">
          <Input value={address2} onChange={(e) => setAddress2(e.target.value)} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="State / Region">
            <Input value={state} onChange={(e) => setState(e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Postal code">
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Country">
            <Input value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="off" />
          </Field>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <footer className="border-t border-white/5 p-3">
        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save identity'}
        </Button>
      </footer>
    </div>
  );
}
