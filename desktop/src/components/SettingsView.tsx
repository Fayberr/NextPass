import { useState } from 'react';
import { Settings, ShieldCheck, Lock, Upload, Download, KeyRound } from './icons';

export function SettingsView() {
  const [tab, setTab] = useState<'general' | 'windowsHello' | 'importExport' | 'hotkeys'>('general');
  const [winHelloEnabled, setWinHelloEnabled] = useState<boolean>(true);
  const [autoLockDuration, setAutoLockDuration] = useState<string>('15min');
  const [autostart, setAutostart] = useState<boolean>(true);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-brand-400" />
            <span>Einstellungen</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Anwendungs- und Sicherheitseinstellungen für NextPass Desktop
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex gap-2 border-b border-white/10 mb-6 shrink-0 text-xs font-semibold">
        <button
          onClick={() => setTab('general')}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            tab === 'general'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Allgemein & Auto-Sperre
        </button>
        <button
          onClick={() => setTab('windowsHello')}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            tab === 'windowsHello'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Windows Hello / TPM Quick Unlock
        </button>
        <button
          onClick={() => setTab('importExport')}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            tab === 'importExport'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Import / Export & Backup
        </button>
        <button
          onClick={() => setTab('hotkeys')}
          className={`pb-2.5 px-3 transition-colors border-b-2 ${
            tab === 'hotkeys'
              ? 'border-brand-500 text-brand-300'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Tastenverbindungen (HUD)
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto max-w-3xl space-y-6">
        {tab === 'general' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Automatische Sperre</h3>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Datenspeicher automatisch sperren nach Inaktivität:</span>
                <select
                  value={autoLockDuration}
                  onChange={(e) => setAutoLockDuration(e.target.value)}
                  className="bg-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:border-brand-500"
                >
                  <option value="5min">Nach 5 Minuten</option>
                  <option value="15min">Nach 15 Minuten</option>
                  <option value="1hour">Nach 1 Stunde</option>
                  <option value="never">Niemals (Nicht empfohlen)</option>
                </select>
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Systemstart</h3>
              <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                <span>NextPass beim Start des Betriebssystems automatisch ausführen</span>
                <input
                  type="checkbox"
                  checked={autostart}
                  onChange={(e) => setAutostart(e.target.checked)}
                  className="h-4 w-4 rounded bg-zinc-800 border-white/10 text-brand-600 focus:ring-brand-500"
                />
              </label>
            </div>
          </div>
        )}

        {tab === 'windowsHello' && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Windows Hello & TPM Hardware Entsperrung</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Verwenden Sie Ihre Windows Hello PIN oder Biometrie (TPM hardware-gesichert), um den Tresor nach dem ersten Master-Passwort-Login blitzschnell zu entsperren.
                </p>
              </div>

              <input
                type="checkbox"
                checked={winHelloEnabled}
                onChange={(e) => setWinHelloEnabled(e.target.checked)}
                className="h-5 w-5 rounded bg-zinc-800 border-white/10 text-emerald-600 focus:ring-emerald-500 shrink-0"
              />
            </div>
          </div>
        )}

        {tab === 'importExport' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Upload className="h-4 w-4 text-brand-400" />
                <span>Daten Importieren</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Importieren Sie Ihre Passwörter aus Kaspersky Password Manager CSV, Bitwarden, 1Password oder Google Chrome.
              </p>
              <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-white/10 transition-colors">
                CSV Datei auswählen & importieren
              </button>
            </div>

            <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Verschlüsseltes Backup Erstellen</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Erstellen Sie eine verschlüsselte lokale Sicherungskopie Ihres Datenspeichers.
              </p>
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-colors">
                Backup Datei exportieren
              </button>
            </div>
          </div>
        )}

        {tab === 'hotkeys' && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-semibold text-zinc-200">Globaler Schnellsuche Overlay Hotkey</h3>
            <p className="text-xs text-zinc-400">
              Drücken Sie diesen Tastendruck überall in Windows, um das Spotlight/Raycast Quick-Search Fenster zu öffnen:
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-950 rounded-xl border border-white/10 font-mono text-sm text-brand-300">
              <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-xs">Ctrl</kbd> +
              <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-xs">Alt</kbd> +
              <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-xs">A</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
