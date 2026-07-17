import { useEffect, useState } from 'react';
import { Button, Card } from '../ui.js';
import { ArrowLeft, Check, Copy, Eye, EyeOff, Pencil, Trash } from '../icons.js';
import { send } from '../client.js';
import type { LoginFields } from '@pm/shared';

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  const shown = secret && !revealed ? '•'.repeat(Math.min(value.length, 16)) : value;

  return (
    <div className="mb-2">
      <div className="text-[11px] text-white/40">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`min-w-0 flex-1 truncate text-sm ${secret ? 'font-mono' : ''} text-white/90`}>
          {shown}
        </span>
        {secret && (
          <button
            onClick={() => setRevealed((r) => !r)}
            className="text-white/40 hover:text-white/70"
            title={revealed ? 'Hide' : 'Reveal'}
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        <button onClick={copy} className="text-white/40 hover:text-white/70" title="Copy">
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

export function ItemDetail({
  id,
  onBack,
  onEdit,
  onDeleted,
}: {
  id: string;
  onBack: () => void;
  onEdit: (id: string, fields: LoginFields) => void;
  onDeleted: () => void;
}) {
  const [fields, setFields] = useState<LoginFields | null>(null);
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    send({ kind: 'get_item', id }).then((res) => {
      if (res.ok && res.kind === 'item') {
        setFields(res.fields as LoginFields);
        setType(res.type);
      } else if (!res.ok) {
        setError(res.error);
      }
    });
  }, [id]);

  async function del() {
    setBusy(true);
    const res = await send({ kind: 'delete_item', id });
    setBusy(false);
    if (res.ok) onDeleted();
    else setError(res.error);
  }

  const editable = type === 'login';

  return (
    <div className="flex h-[500px] flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <Button variant="subtle" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="ml-auto flex items-center gap-1">
          {editable && fields && (
            <Button variant="subtle" onClick={() => onEdit(id, fields)} title="Edit">
              <Pencil size={16} />
            </Button>
          )}
          <Button
            variant="subtle"
            onClick={() => setConfirmDel(true)}
            title="Delete"
            className="hover:text-red-400"
          >
            <Trash size={16} />
          </Button>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/50">
            {type}
          </span>
        </div>
      </header>

      {confirmDel && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 p-3">
          <span className="flex-1 text-xs text-white/80">Delete this item permanently?</span>
          <Button variant="subtle" onClick={() => setConfirmDel(false)} disabled={busy}>
            Cancel
          </Button>
          <button
            onClick={del}
            disabled={busy}
            className="rounded-full bg-red-500/80 px-3 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-40"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!fields ? (
          <p className="text-center text-xs text-white/30">Loading…</p>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-semibold">{fields.name || '(no name)'}</h2>
            <Card>
              {fields.username && <CopyRow label="Username" value={fields.username} />}
              {fields.email && <CopyRow label="Email" value={fields.email} />}
              {fields.password && <CopyRow label="Password" value={fields.password} secret />}
              {fields.totp && <CopyRow label="TOTP secret" value={fields.totp} secret />}
            </Card>

            {fields.uris?.length > 0 && (
              <Card className="mt-3">
                <div className="mb-1 text-[11px] text-white/40">Websites</div>
                {fields.uris.map((u, i) => (
                  <div key={i} className="truncate text-sm text-violet-soft">
                    {u}
                  </div>
                ))}
                <div className="mt-1 text-[10px] text-white/30">Match: {fields.matchMode}</div>
              </Card>
            )}

            {fields.notes && (
              <Card className="mt-3">
                <div className="mb-1 text-[11px] text-white/40">Notes</div>
                <p className="whitespace-pre-wrap text-sm text-white/80">{fields.notes}</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
