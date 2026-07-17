import { useEffect, useState } from 'react';
import { Button } from '../ui.js';
import { ArrowLeft, ShieldCheck } from '../icons.js';
import { send } from '../client.js';
import type { AuditReport, Weakness } from '@pm/shared';

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

  useEffect(() => {
    void (async () => {
      const res = await send({ kind: 'audit' });
      if (res.ok && res.kind === 'audit') setReport(res.report);
    })();
  }, []);

  const flagged = report?.entries.filter((e) => e.issues.length > 0) ?? [];

  return (
    <div className="flex h-[500px] flex-col">
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
          <div className="mb-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
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
