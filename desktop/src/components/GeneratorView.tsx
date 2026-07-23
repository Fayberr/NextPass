import { useState, useEffect } from 'react';
import { Wand, Copy, Check, RefreshCw } from './icons';

export function GeneratorView() {
  const [mode, setMode] = useState<'password' | 'passphrase'>('password');
  const [length, setLength] = useState<number>(20);
  const [useUpper, setUseUpper] = useState<boolean>(true);
  const [useLower, setUseLower] = useState<boolean>(true);
  const [useDigits, setUseDigits] = useState<boolean>(true);
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const [passphraseWords, setPassphraseWords] = useState<number>(4);
  const [generated, setGenerated] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const generate = () => {
    if (mode === 'passphrase') {
      const words = [
        'correct', 'horse', 'battery', 'staple', 'galaxy', 'quantum', 'cipher',
        'phoenix', 'shadow', 'nebula', 'cosmic', 'thunder', 'falcon', 'vortex',
        'titan', 'starlight', 'dragon', 'horizon', 'pulse', 'magma', 'crystal'
      ];
      const picked: string[] = [];
      for (let i = 0; i < passphraseWords; i++) {
        picked.push(words[Math.floor(Math.random() * words.length)]);
      }
      setGenerated(picked.join('-'));
    } else {
      let chars = '';
      if (useLower) chars += 'abcdefghijklmnopqrstuvwxyz';
      if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (useDigits) chars += '0123456789';
      if (useSymbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setGenerated(result);
    }
  };

  useEffect(() => {
    generate();
  }, [mode, length, useUpper, useLower, useDigits, useSymbols, passphraseWords]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-6 overflow-y-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wand className="h-5 w-5 text-brand-400" />
            <span>Kennwort-Generator</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Generieren Sie hochsichere Passwörter oder einprägsame Passphrasen
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-white/10 w-max mb-6">
        <button
          onClick={() => setMode('password')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'password'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Zufallspasswort
        </button>
        <button
          onClick={() => setMode('passphrase')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'passphrase'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Passphrase (Wörter)
        </button>
      </div>

      {/* Main Generated Output Display Box */}
      <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur-md relative">
        <div className="flex items-center justify-between gap-4">
          <div className="font-mono text-xl md:text-2xl font-bold tracking-wider text-brand-300 break-all select-all">
            {generated}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={generate}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-white/10 transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-brand-600/20 border border-brand-400/20 transition-all hover:scale-[1.02]"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls & Options */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur-md">
        {mode === 'password' ? (
          <>
            {/* Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-zinc-300">Länge des Kennworts</span>
                <span className="font-mono text-brand-400">{length} Zeichen</span>
              </div>
              <input
                type="range"
                min={8}
                max={64}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Checkbox Toggles */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useUpper}
                  onChange={(e) => setUseUpper(e.target.checked)}
                  className="h-4 w-4 rounded bg-zinc-800 border-white/10 text-brand-600 focus:ring-brand-500"
                />
                <span>Grossbuchstaben (A-Z)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLower}
                  onChange={(e) => setUseLower(e.target.checked)}
                  className="h-4 w-4 rounded bg-zinc-800 border-white/10 text-brand-600 focus:ring-brand-500"
                />
                <span>Kleinbuchstaben (a-z)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDigits}
                  onChange={(e) => setUseDigits(e.target.checked)}
                  className="h-4 w-4 rounded bg-zinc-800 border-white/10 text-brand-600 focus:ring-brand-500"
                />
                <span>Zahlen (0-9)</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSymbols}
                  onChange={(e) => setUseSymbols(e.target.checked)}
                  className="h-4 w-4 rounded bg-zinc-800 border-white/10 text-brand-600 focus:ring-brand-500"
                />
                <span>Sonderzeichen (!@#$)</span>
              </label>
            </div>
          </>
        ) : (
          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-zinc-300">Anzahl der Wörter</span>
              <span className="font-mono text-brand-400">{passphraseWords} Wörter</span>
            </div>
            <input
              type="range"
              min={3}
              max={8}
              value={passphraseWords}
              onChange={(e) => setPassphraseWords(Number(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
