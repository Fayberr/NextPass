import { useEffect, useState } from 'react';
import { Button, Field, Select } from '../ui.js';
import { ArrowLeft } from '../icons.js';
import { send } from '../client.js';
import { DEFAULT_SETTINGS, type Settings as SettingsType } from '../../lib/settings.js';

const LOCK_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
];
const CLIP_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 10, label: '10 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
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
