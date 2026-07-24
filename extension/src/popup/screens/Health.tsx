import { useEffect, useState } from 'react';
import { Button } from '../ui.js';
import { ArrowLeft, ShieldCheck } from '../icons.js';
import { send } from '../client.js';
import type { AuditReport, Weakness } from '@pm/shared';
import type { BreachReport } from '../../lib/messages.js';

const ISSUE_LABEL: Record<Weakness, string> = {
  weak: 'Weak',
  reused: 'Reused',
  old: 'Old',
  no_password: 'No password',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

export function Health({ onBack, onSelect }: { onBack: () => void; onSelect: (id: string) => void }) {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [breachEnabled, setBreachEnabled] = useState<boolean | null>(null);
  const [breach, setBreach] = useState<BreachReport | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await send({ kind: 'audit' });
      if (res.ok && res.kind === 'audit') setReport(res.report);
    })();
    // Opt-in breach check (HIBP k-anonymity) - only runs when enabled in Settings.
    void (async () => {
      const s = await send({ kind: 'get_settings' });
      const enabled = s.ok && s.kind === 'settings' && s.settings.breachCheck;
      setBreachEnabled(!!enabled);
      if (!enabled) return;
      const res = await send({ kind: 'breach_check' });
      if (res.ok && res.kind === 'breach') setBreach(res.report);
    })();
  }, []);

  const flagged = report?.entries.filter((e) => e.issues.length > 0) ?? [];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <Button variant="subtle" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <span className="text-sm font-semibold">Password health</span>
      </header>

      {!report ? (
        <p className="p-6 text-center text-xs text-white/30">Analyzing…</p>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/5 p-4">
            <ShieldCheck size={32} className={scoreColor(report.score)} />
            <div>
              <div className={`text-3xl font-semibold tabular-nums ${scoreColor(report.score)}`}>
                {report.score}
              </div>
              <div className="text-[11px] text-white/40">Vault health score</div>
            </div>
            <div className="ml-auto grid grid-cols-3 gap-2 text-center text-[11px]">
              <Stat n={report.counts.weak} label="Weak" />
              <Stat n={report.counts.reused} label="Reused" />
              <Stat n={report.counts.old} label="Old" />
            </div>
          </div>

          {/* Compromised passwords (opt-in online check) */}
          <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/5 p-4">
            <div className="mb-1 text-sm font-semibold text-white/90">Compromised passwords</div>
            {breachEnabled === false ? (
              <p className="text-[11px] text-white/40">
                The online breach check is off. Enable it under Settings → General to check your
                passwords against known data breaches (only anonymous hash prefixes ever leave this
                device).
              </p>
            ) : !breach ? (
              <p className="text-[11px] text-white/40">Checking against known breaches…</p>
            ) : breach.breached.length === 0 ? (
              <p className="text-[11px] text-emerald-400">
                None of your {breach.checked} checked passwords appear in known breaches.
              </p>
            ) : (
              <>
                <p className="mb-2 text-[11px] text-red-400">
                  {breach.breached.length} of {breach.checked} checked passwords appear in known
                  breaches. Change them as soon as possible.
                </p>
                {breach.breached.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onSelect(b.id)}
                    className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-white/90">{b.name}</span>
                    <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-400">
                      seen {b.count.toLocaleString()}×
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          {flagged.length === 0 ? (
            <p className="p-6 text-center text-xs text-emerald-400">
              No issues found. Every login looks healthy.
            </p>
          ) : (
            flagged.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelect(e.id)}
                className="mb-1.5 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-white/90">{e.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {e.issues.map((iss) => (
                      <span
                        key={iss}
                        className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60"
                      >
                        {ISSUE_LABEL[iss]}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums text-white/90">{n}</div>
      <div className="text-white/40">{label}</div>
    </div>
  );
}
