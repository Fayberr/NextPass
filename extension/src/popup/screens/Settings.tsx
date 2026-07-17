import { useEffect, useState } from 'react';
import { Button, Field } from '../ui.js';
import { ArrowLeft } from '../icons.js';
import { send } from '../client.js';
import { DEFAULT_SETTINGS, type Settings as SettingsType } from '../../lib/settings.js';

const LOCK_OPTIONS = [
  { v: 0, label: 'Never' },
  { v: 1, label: '1 min' },
  { v: 5, label: '5 min' },
  { v: 15, label: '15 min' },
  { v: 30, label: '30 min' },
  { v: 60, label: '1 hour' },
];
const CLIP_OPTIONS = [
  { v: 0, label: 'Never' },
  { v: 10, label: '10 s' },
  { v: 30, label: '30 s' },
  { v: 60, label: '1 min' },
  { v: 120, label: '2 min' },
];

export function Settings({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await send({ kind: 'get_settings' });
      if (res.ok && res.kind === 'settings') setS(res.settings);
    })();
  }, []);

  async function update(patch: Partial<SettingsType>) {
    const next = { ...s, ...patch };
    setS(next);
    await send({ kind: 'set_settings', patch });
    setSaved(true);
    setTimeout(() => setSaved(false), 1000);
  }

  return (
    <div className="flex h-[500px] flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <Button variant="subtle" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <span className="text-sm font-semibold">Settings</span>
        {saved && <span className="ml-auto text-[11px] text-emerald-400">Saved</span>}
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Auto-lock after inactivity">
          <Select
            value={s.autoLockMinutes}
            options={LOCK_OPTIONS}
            onChange={(v) => update({ autoLockMinutes: v })}
          />
        </Field>

        <Field label="Clear copied passwords after">
          <Select
            value={s.clipboardClearSeconds}
            options={CLIP_OPTIONS}
            onChange={(v) => update({ clipboardClearSeconds: v })}
          />
        </Field>

        <p className="mt-4 text-[11px] leading-relaxed text-white/30">
          Auto-lock forgets the vault key after the chosen idle time; you'll need your master
          password to unlock again. Clipboard clearing overwrites a copied password after the delay.
        </p>
      </div>
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: number;
  options: { v: number; label: string }[];
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-white/10 bg-ink-700 px-3 py-2 text-sm text-white/90 outline-none"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
