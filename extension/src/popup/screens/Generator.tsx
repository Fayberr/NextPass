import { useEffect, useState } from 'react';
import { Button, Field } from '../ui.js';
import { ArrowLeft, Copy, Check, RefreshCw } from '../icons.js';
import { send } from '../client.js';
import { generatePassword, generatePassphrase } from '@pm/shared';
import { DEFAULT_SETTINGS, type GeneratorDefaults } from '../../lib/settings.js';

/** Standalone password / passphrase generator. Seeds its options from the saved generator
 *  defaults (Settings) and can persist changes back so the inline generators stay in sync. */
export function Generator({ onBack }: { onBack: () => void }) {
  const [g, setG] = useState<GeneratorDefaults>(DEFAULT_SETTINGS.gen);
  const [value, setValue] = useState('');
  const [copied, setCopied] = useState(false);

  function patch(p: Partial<GeneratorDefaults>) {
    setG((prev) => ({ ...prev, ...p }));
  }

  function regen(cur = g) {
    const out =
      cur.mode === 'passphrase'
        ? generatePassphrase({ words: cur.words, capitalize: cur.uppercase, number: cur.digits })
        : generatePassword({
            length: cur.length,
            digits: cur.digits,
            symbols: cur.symbols,
            uppercase: cur.uppercase,
            avoidAmbiguous: cur.avoidAmbiguous,
          });
    setValue(out);
  }

  useEffect(() => {
    void (async () => {
      const res = await send({ kind: 'get_settings' });
      const gen = res.ok && res.kind === 'settings' ? res.settings.gen : DEFAULT_SETTINGS.gen;
      setG(gen);
      regen(gen);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function saveDefaults() {
    await send({ kind: 'set_settings', patch: { gen: g } });
    onBack();
  }

  return (
    <div className="flex h-[500px] flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <Button variant="subtle" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <span className="text-sm font-semibold">Generator</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-stretch gap-1.5">
          <div className="flex flex-1 items-center break-all rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-sm text-white/90">
            {value || '…'}
          </div>
          <button
            onClick={() => regen()}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 text-violet-soft hover:text-white"
            title="Regenerate"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={copy}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 text-white/60 hover:text-white"
            title="Copy"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          </button>
        </div>

        <div className="mb-4 flex rounded-full bg-white/5 p-1 text-xs">
          {(['password', 'passphrase'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                const next = { ...g, mode: m };
                setG(next);
                regen(next);
              }}
              className={`flex-1 rounded-full py-1.5 capitalize transition ${
                g.mode === m ? 'bg-violet-glow text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {g.mode === 'password' ? (
          <>
            <Field label={`Length: ${g.length}`}>
              <input
                type="range"
                min={8}
                max={64}
                value={g.length}
                onChange={(e) => patch({ length: Number(e.target.value) })}
                className="w-full accent-violet-soft"
              />
            </Field>
            <Toggle label="Uppercase (A-Z)" checked={g.uppercase} onChange={(v) => patch({ uppercase: v })} />
            <Toggle label="Digits (0-9)" checked={g.digits} onChange={(v) => patch({ digits: v })} />
            <Toggle label="Symbols (!@#…)" checked={g.symbols} onChange={(v) => patch({ symbols: v })} />
            <Toggle
              label="Avoid ambiguous (O/0, l/1)"
              checked={g.avoidAmbiguous}
              onChange={(v) => patch({ avoidAmbiguous: v })}
            />
          </>
        ) : (
          <>
            <Field label={`Words: ${g.words}`}>
              <input
                type="range"
                min={3}
                max={8}
                value={g.words}
                onChange={(e) => patch({ words: Number(e.target.value) })}
                className="w-full accent-violet-soft"
              />
            </Field>
            <Toggle label="Capitalize words" checked={g.uppercase} onChange={(v) => patch({ uppercase: v })} />
            <Toggle label="Append a number" checked={g.digits} onChange={(v) => patch({ digits: v })} />
          </>
        )}
      </div>

      <footer className="flex gap-2 border-t border-white/5 p-3">
        <Button variant="ghost" className="flex-1" onClick={saveDefaults}>
          Save as default
        </Button>
        <Button className="flex-1" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </footer>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="mb-2 flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-white/80">
      {label}
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-violet-soft" />
    </label>
  );
}
