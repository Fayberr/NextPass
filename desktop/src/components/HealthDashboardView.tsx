import { Activity, ShieldCheck, AlertTriangle, RefreshCw, Wand } from './icons';

interface HealthDashboardViewProps {
  compromisedCount: number;
  weakCount: number;
  reusedCount: number;
  strongCount: number;
  totalCount: number;
  onFixIssue: (type: 'compromised' | 'weak' | 'reused') => void;
}

export function HealthDashboardView({
  compromisedCount = 18,
  weakCount = 39,
  reusedCount = 37,
  strongCount = 105,
  totalCount = 199,
  onFixIssue,
}: HealthDashboardViewProps) {
  const healthScore = Math.round((strongCount / (totalCount || 1)) * 100);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Kennwortprüfung (Security Audit)</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Echtzeit-Sicherheitsanalyse Ihrer gespeicherten Zugangsdaten
          </p>
        </div>

        <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl border border-white/10 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Neu analysieren</span>
        </button>
      </div>

      {/* Security Health Hero Card */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-brand-950/40 border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>Automatischer Sicherheitscheck Aktiv</span>
          </div>
          <h3 className="text-base font-bold text-white">Was Sie über Kennwortsicherheit wissen müssen</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Ein sicheres Kennwort schützt Ihre Daten. Wir überprüfen Ihre Passwörter auf Bekanntheit in Leaks (HaveIBeenPwned), Wiederverwendung und Passwortstärke.
          </p>
        </div>

        {/* Big Health Ring Score Display */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="h-28 w-28 transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="46"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-zinc-800"
            />
            <circle
              cx="56"
              cy="56"
              r="46"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={289}
              strokeDashoffset={289 - (289 * healthScore) / 100}
              className="text-emerald-400 transition-all duration-1000"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-2xl font-bold text-white font-mono">{healthScore}%</span>
            <span className="block text-[9px] uppercase tracking-wider text-zinc-400">Score</span>
          </div>
        </div>
      </div>

      {/* Audit Breakdown Category Cards (Kaspersky screenshot 165026 style) */}
      <div className="space-y-3 max-w-4xl">
        {/* 1. Compromised Passwords */}
        <div
          onClick={() => onFixIssue('compromised')}
          className="group bg-zinc-900/60 hover:bg-rose-950/20 border border-white/10 hover:border-rose-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all backdrop-blur-md"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white font-mono">{compromisedCount}</span>
                <span className="text-xs font-semibold text-rose-400">kompromittierte Kennwörter</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                  Dringend Ändern
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Diese Kennwörter tauchen in öffentlichen Datenlecks auf und wurden gehackt.
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 text-xs bg-rose-600/30 group-hover:bg-rose-600 text-rose-200 rounded-xl border border-rose-500/40 transition-colors flex items-center gap-1.5">
            <Wand className="h-3.5 w-3.5" />
            <span>Jetzt beheben</span>
          </button>
        </div>

        {/* 2. Weak Passwords */}
        <div
          onClick={() => onFixIssue('weak')}
          className="group bg-zinc-900/60 hover:bg-amber-950/20 border border-white/10 hover:border-amber-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all backdrop-blur-md"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white font-mono">{weakCount}</span>
                <span className="text-xs font-semibold text-amber-400">schwache Kennwörter</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Diese Passwörter sind zu kurz oder einfach strukturiert und leicht erratbar.
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 text-xs bg-zinc-800 group-hover:bg-amber-500/20 text-amber-300 rounded-xl border border-white/10 group-hover:border-amber-500/40 transition-colors">
            Anzeigen
          </button>
        </div>

        {/* 3. Reused Passwords */}
        <div
          onClick={() => onFixIssue('reused')}
          className="group bg-zinc-900/60 hover:bg-yellow-950/20 border border-white/10 hover:border-yellow-500/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all backdrop-blur-md"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white font-mono">{reusedCount}</span>
                <span className="text-xs font-semibold text-yellow-400">mehrfach verwendete Kennwörter</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Dieselben Passwörter für mehrere Konten erhöhen das Risiko bei Leaks.
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 text-xs bg-zinc-800 group-hover:bg-yellow-500/20 text-yellow-300 rounded-xl border border-white/10 group-hover:border-yellow-500/40 transition-colors">
            Anzeigen
          </button>
        </div>

        {/* 4. Strong Passwords */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white font-mono">{strongCount}</span>
                <span className="text-xs font-semibold text-emerald-400">starke Kennwörter</span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Alle diese Kennwörter sind individuell, ausreichend lang und sicher verschlüsselt.
              </p>
            </div>
          </div>
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
        </div>
      </div>
    </div>
  );
}
