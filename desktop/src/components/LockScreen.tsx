import { useState } from 'react';
import { ShieldCheck, Lock, KeyRound } from './icons';

interface LockScreenProps {
  onUnlock: (password: string) => void;
  onWindowsHelloUnlock: () => void;
}

export function LockScreen({ onUnlock, onWindowsHelloUnlock }: LockScreenProps) {
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Bitte geben Sie Ihr Master-Kennwort ein.');
      return;
    }
    setError(null);
    onUnlock(password);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 p-6 relative overflow-hidden select-none">
      {/* Soft Glow Ambient Background */}
      <div className="absolute h-96 w-96 rounded-full bg-brand-600/10 blur-3xl pointer-events-none -top-20" />
      <div className="absolute h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none -bottom-20" />

      {/* Main Lock Card */}
      <div className="w-full max-w-md bg-zinc-900/80 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center relative z-10">
        {/* Brand Icon */}
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-xl shadow-brand-500/20 mb-6">
          <ShieldCheck className="h-10 w-10 text-white" />
        </div>

        <h1 className="text-xl font-bold text-white tracking-tight">
          NextPass Password Manager
        </h1>
        <p className="text-xs text-zinc-400 mt-2">
          Der Datenspeicher ist gesperrt. Geben Sie Ihr Master-Kennwort ein.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full mt-6 space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master-Kennwort eingeben"
              className="w-full bg-zinc-950 text-sm text-white placeholder-zinc-500 rounded-xl px-4 py-3 border border-white/10 focus:border-brand-500 focus:outline-none transition-colors text-center font-mono"
              autoFocus
            />
            {error && <p className="text-xs text-rose-400 mt-1.5 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/20 border border-brand-400/20 transition-all flex items-center justify-center gap-2"
          >
            <Lock className="h-4 w-4" />
            <span>Entsperren</span>
          </button>
        </form>

        {/* Windows Hello / TPM Quick Unlock Button */}
        <div className="mt-6 pt-6 border-t border-white/10 w-full">
          <button
            onClick={onWindowsHelloUnlock}
            className="w-full py-2.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium text-xs rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <KeyRound className="h-4 w-4 text-emerald-400" />
            <span>Mit Windows Hello PIN entsperren</span>
          </button>
        </div>
      </div>
    </div>
  );
}
