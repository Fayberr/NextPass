import { useState, useEffect } from 'react';
import { Favicon } from './Favicon';
import { Copy, Check, Smartphone, Plus } from './icons';

export interface TotpItem {
  id: string;
  title: string;
  url?: string;
  secret: string;
  issuer?: string;
}

interface AuthenticatorViewProps {
  items: TotpItem[];
  onAddTotp: () => void;
}

// Simple TOTP generator helper (30s step)
function getTotpCode(secret: string): string {
  // Simple deterministic demo code based on secret + time step
  const timeStep = Math.floor(Date.now() / 30000);
  let hash = 0;
  for (let i = 0; i < secret.length; i++) {
    hash = (hash << 5) - hash + secret.charCodeAt(i);
    hash |= 0;
  }
  const val = Math.abs(hash + timeStep) % 1000000;
  return val.toString().padStart(6, '0');
}

export function AuthenticatorView({ items, onAddTotp }: AuthenticatorViewProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(30 - (Math.floor(Date.now() / 1000) % 30));
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
      setSecondsLeft(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-400" />
            <span>2FA Authenticator</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Einmalkennwörter (TOTP) mit automatischem 30-Sekunden-Countdown
          </p>
        </div>

        <button
          onClick={onAddTotp}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Einmalkennwort hinzufügen</span>
        </button>
      </div>

      {/* Grid of 2FA Cards */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
        {items.map((item) => {
          const code = getTotpCode(item.secret);
          const formattedCode = `${code.slice(0, 3)} ${code.slice(3)}`;
          const isCopied = copiedId === item.id;

          return (
            <div
              key={item.id}
              onClick={() => handleCopy(code, item.id)}
              className="group bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-5 transition-all cursor-pointer backdrop-blur-md relative flex flex-col justify-between overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Favicon url={item.url} title={item.title} size={28} />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-100">{item.title}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">{item.issuer || item.url || 'TOTP 2FA'}</p>
                  </div>
                </div>

                {/* Animated Radial Timer */}
                <div className="relative h-6 w-6 flex items-center justify-center">
                  <svg className="h-6 w-6 transform -rotate-90">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="transparent"
                      className="text-zinc-800"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="transparent"
                      strokeDasharray={56.5}
                      strokeDashoffset={56.5 - (56.5 * secondsLeft) / 30}
                      className="text-emerald-400 transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute text-[9px] font-mono font-bold text-zinc-300">
                    {secondsLeft}
                  </span>
                </div>
              </div>

              {/* Big 6-Digit TOTP Code Display */}
              <div className="mt-6 flex items-center justify-between bg-zinc-950/80 p-3 rounded-xl border border-white/5 group-hover:border-emerald-500/20 transition-colors">
                <span className="font-mono text-xl font-bold tracking-widest text-emerald-400">
                  {formattedCode}
                </span>

                <button className="p-1.5 text-zinc-500 group-hover:text-emerald-400 rounded-lg">
                  {isCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
