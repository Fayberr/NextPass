import { useState } from 'react';
import { Button, Field, Input, Textarea } from '../ui.js';
import { ArrowLeft } from '../icons.js';
import { send } from '../client.js';
import type { NoteFields } from '@pm/shared';

/** Add OR edit a freeform general note - plain text body, no autofill/matching semantics. */
export function AddNote({
  onDone,
  onCancel,
  editId,
  initial,
}: {
  onDone: () => void;
  onCancel: () => void;
  editId?: string;
  initial?: NoteFields;
}) {
  const editing = !!editId;
  const [name, setName] = useState(initial?.name ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const fields: NoteFields = {
      ...initial,
      name: name.trim() || 'Untitled note',
      body,
    };
    const res = editing
      ? await send({ kind: 'update_note', id: editId!, fields })
      : await send({ kind: 'create_note', fields });
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
        <span className="text-sm font-semibold">{editing ? 'Edit note' : 'New note'}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Title">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wi-Fi password" />
        </Field>
        <Field label="Note">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            placeholder="Write anything…"
          />
        </Field>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <footer className="border-t border-white/5 p-3">
        <Button className="w-full" onClick={save} disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Save note'}
        </Button>
      </footer>
    </div>
  );
}
