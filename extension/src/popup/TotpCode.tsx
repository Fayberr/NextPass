import { useEffect, useState } from 'react';
import { Check, Copy } from './icons.js';
import { copyWithClear } from './clipboard.js';
import { generateTotp } from '@pm/shared';

/**
 * Live TOTP code with a countdown ring. Recomputes from the stored secret / otpauth URI every
 * second, entirely on-device. The secret never leaves the popup process.
 */
export function TotpCode({
  secret,
  label = 'One-time code',
  compact = false,
}: {
  secret: string;
  label?: string;
  compact?: boolean;
}) {
  const [code, setCode] = useState('------');
  const [remaining, setRemaining] = useState(30);
  const [period, setPeriod] = useState(30);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await generateTotp(secret);
        if (!alive) return;
        setCode(r.code);
        setRemaining(r.secondsRemaining);
        setPeriod(r.period);
        setError(false);
      } catch {
        if (alive) setError(true);
      }
    }
    void tick();
    const t = setInterval(tick, 1000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [secret]);

  async function copy() {
    await copyWithClear(code.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  if (error) {
    return <div className="text-[11px] text-red-400">{compact ? '⚠' : 'Invalid TOTP secret'}</div>;
  }

  const pct = (remaining / period) * 100;
  const grouped = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

  if (compact) {
    return (
      <button onClick={copy} className="flex items-center gap-1.5" title={`Copy code · ${remaining}s`}>
        <span className="font-mono text-sm tracking-wide text-violet-soft tabular-nums">{grouped}</span>
        <div className="relative h-4 w-4 shrink-0">
          <svg viewBox="0 0 36 36" className="h-4 w-4 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="5" className="text-white/10" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              className={remaining <= 5 ? 'text-red-400' : 'text-violet-soft'}
              strokeDasharray={2 * Math.PI * 15}
              strokeDashoffset={2 * Math.PI * 15 * (1 - pct / 100)}
            />
          </svg>
        </div>
      </button>
    );
  }

  return (
    <div className="mb-2">
      {label && <div className="text-[11px] text-white/40">{label}</div>}
      <div className="flex items-center gap-2">
        <span className="flex-1 font-mono text-lg tracking-widest text-white/90 tabular-nums">
          {grouped}
        </span>
        <div className="relative h-6 w-6 shrink-0" title={`${remaining}s`}>
          <svg viewBox="0 0 36 36" className="h-6 w-6 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              className={remaining <= 5 ? 'text-red-400' : 'text-violet-soft'}
              strokeDasharray={2 * Math.PI * 15}
              strokeDashoffset={2 * Math.PI * 15 * (1 - pct / 100)}
            />
          </svg>
        </div>
        <button onClick={copy} className="text-white/40 hover:text-white/70" title="Copy code">
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}
