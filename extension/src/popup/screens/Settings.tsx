import { useEffect, useState } from 'react';
import { Button, Field, Input, Select, Card } from '../ui.js';
import { ArrowLeft, Lock, Download, Upload, AlertTriangle, ShieldCheck, Check } from '../icons.js';
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

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Settings({ onBack }: { onBack: () => void }) {
  const [s, setS] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  // Master Password Change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Export State
  const [exportingFormat, setExportingFormat] = useState<'encrypted' | 'unencrypted' | null>(null);
  const [showUnencryptedWarning, setShowUnencryptedWarning] = useState(false);
  const [downloadingRecovery, setDownloadingRecovery] = useState(false);

  async function handleDownloadRecovery() {
    setDownloadingRecovery(true);
    try {
      const res = await send({ kind: 'download_recovery' });
      if (res.ok && res.kind === 'export') {
        downloadFile(res.filename, res.data);
      } else if (!res.ok) {
        alert(`Failed to download recovery phrase: ${res.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDownloadingRecovery(false);
    }
  }

  // Import State
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Purge State
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeMasterPw, setPurgeMasterPw] = useState('');
  const [purgeDownloadBackup, setPurgeDownloadBackup] = useState(true);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [purgeError, setPurgeError] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);

  async function handlePurgeVault(e: React.FormEvent) {
    e.preventDefault();
    setPurgeError(null);
    setPurgeBusy(true);

    try {
      const res = await send({
        kind: 'purge_vault',
        masterPassword: purgeMasterPw,
        downloadBackup: purgeDownloadBackup,
      });

      if (!res.ok) {
        setPurgeError(res.error || 'Failed to purge vault.');
      } else if (res.kind === 'purge_result') {
        if (res.backupData && res.backupFilename) {
          downloadFile(res.backupFilename, res.backupData);
        }
        setShowPurgeModal(false);
        setPurgeMasterPw('');
        setPurgeSuccess('All items have been purged from your vault.');
      }
    } catch (err) {
      setPurgeError(err instanceof Error ? err.message : String(err));
    } finally {
      setPurgeBusy(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(null);
    setImportBusy(true);

    try {
      const text = await file.text();
      let backupPassword: string | undefined = undefined;

      try {
        const json = JSON.parse(text);
        if (json.type === 'encrypted_password') {
          const pass = prompt('Enter the backup password used to encrypt this file:');
          if (!pass) {
            setImportBusy(false);
            return;
          }
          backupPassword = pass;
        }
      } catch {
        setImportError('Selected file is not valid JSON.');
        setImportBusy(false);
        return;
      }

      const res = await send({ kind: 'import_backup', jsonText: text, password: backupPassword });
      if (res.ok && res.kind === 'import_result') {
        let msg = `Successfully imported ${res.imported} item${res.imported === 1 ? '' : 's'}.`;
        if (res.duplicates > 0) {
          msg += ` (${res.duplicates} duplicate${res.duplicates === 1 ? '' : 's'} skipped)`;
        }
        if (res.failed > 0) {
          msg += ` [${res.failed} failed]`;
        }
        setImportSuccess(msg);
      } else if (!res.ok) {
        setImportError(res.error || 'Failed to import backup file.');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportBusy(false);
      e.target.value = '';
    }
  }

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

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (!currentPw) {
      setPwError('Current password is required.');
      return;
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwBusy(true);
    try {
      const res = await send({
        kind: 'change_master_password',
        currentPassword: currentPw,
        newPassword: newPw,
      });

      if (!res.ok) {
        setPwError(res.error || 'Failed to change password.');
      } else {
        setPwSuccess(true);
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        window.location.reload();
      }
    } catch (err) {
      setPwError(err instanceof Error ? err.message : String(err));
    } finally {
      setPwBusy(false);
    }
  }

  async function handleExport(format: 'encrypted' | 'unencrypted') {
    setExportingFormat(format);
    try {
      const res = await send({ kind: 'export_vault', format });
      if (res.ok && res.kind === 'export') {
        downloadFile(res.filename, res.data);
      } else if (!res.ok) {
        alert(`Export failed: ${res.error}`);
      }
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExportingFormat(null);
      setShowUnencryptedWarning(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <Button variant="subtle" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </Button>
        <span className="text-sm font-semibold">Settings</span>
        {saved && <span className="ml-auto text-[11px] text-emerald-400">Saved</span>}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Security & Lock Preferences */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Vault Preferences</h2>
          <Card className="p-3 space-y-3">
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
          </Card>
        </section>

        {/* Change Master Password */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Change Master Password</h2>
          <Card className="p-3">
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <Field label="Current Master Password">
                <Input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </Field>

              <Field label="New Master Password">
                <Input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </Field>

              <Field label="Confirm New Password">
                <Input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </Field>

              {pwError && <p className="text-xs text-rose-400">{pwError}</p>}
              {pwSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check size={14} /> Master password updated successfully!
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full" disabled={pwBusy}>
                {pwBusy ? 'Updating...' : 'Update Master Password'}
              </Button>
            </form>
          </Card>
        </section>

        {/* Backup & Export */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Backup & Export</h2>
          <Card className="p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-white/80">Encrypted Backup (.json)</p>
              <p className="text-[11px] text-white/40 mt-0.5">
                Safe for cloud storage. Encrypted with your vault credentials.
              </p>
              <Button
                variant="secondary"
                className="mt-2 w-full justify-center"
                disabled={exportingFormat !== null}
                onClick={() => void handleExport('encrypted')}
              >
                <Lock size={14} className="mr-1.5" />
                {exportingFormat === 'encrypted' ? 'Exporting...' : 'Export Encrypted Backup'}
              </Button>
            </div>

            <div className="border-t border-white/5 pt-3">
              <p className="text-xs font-medium text-white/80">12-Word Recovery Phrase (.txt)</p>
              <p className="text-[11px] text-white/40 mt-0.5">
                Generates a fresh 12-word emergency phrase to recover your vault if password is lost.
              </p>
              <Button
                variant="secondary"
                className="mt-2 w-full justify-center"
                disabled={downloadingRecovery}
                onClick={handleDownloadRecovery}
              >
                <ShieldCheck size={14} className="mr-1.5" />
                {downloadingRecovery ? 'Generating...' : 'Download Recovery Phrase (.txt)'}
              </Button>
            </div>

            <div className="border-t border-white/5 pt-3">
              <p className="text-xs font-medium text-white/80">Unencrypted Export (.json)</p>
              <p className="text-[11px] text-rose-300/60 mt-0.5">
                Contains all passwords in plain text. Store securely offline.
              </p>
              <Button
                variant="subtle"
                className="mt-2 w-full justify-center text-rose-400 hover:bg-rose-500/10"
                disabled={exportingFormat !== null}
                onClick={() => setShowUnencryptedWarning(true)}
              >
                <Download size={14} className="mr-1.5" />
                Export Unencrypted Backup
              </Button>
            </div>
          </Card>
        </section>

        {/* Restore & Import Backup */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Restore & Import</h2>
          <Card className="p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-white/80">Import Backup File (.json)</p>
              <p className="text-[11px] text-white/40 mt-0.5">
                Restore an encrypted backup or unencrypted JSON file back into your active vault.
              </p>

              <label className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-2.5 text-xs font-medium text-white/80 hover:bg-white/[0.06]">
                <Upload size={14} />
                {importBusy ? 'Importing...' : 'Choose Backup File…'}
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  disabled={importBusy}
                  onChange={handleImportFile}
                />
              </label>

              {importError && <p className="mt-2 text-xs text-rose-400">{importError}</p>}
              {importSuccess && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check size={14} /> {importSuccess}
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Danger Zone */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-rose-400/60">Danger Zone</h2>
          <Card className="p-3 space-y-3 border-rose-500/20">
            <div>
              <p className="text-xs font-medium text-white/80">Purge Vault Items</p>
              <p className="text-[11px] text-rose-300/60 mt-0.5">
                Permanently delete and wipe all passwords, cards, and secrets saved in your vault.
              </p>
              <Button
                variant="subtle"
                className="mt-2 w-full justify-center text-rose-400 border border-rose-500/20 hover:bg-rose-500/10"
                onClick={() => {
                  setShowPurgeModal(true);
                  setPurgeError(null);
                }}
              >
                <AlertTriangle size={14} className="mr-1.5" />
                Purge Vault Items
              </Button>

              {purgeSuccess && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check size={14} /> {purgeSuccess}
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>

      {/* Unencrypted Export Warning Modal */}
      {showUnencryptedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm p-4 space-y-3 border-rose-500/30">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle size={20} />
              <span className="font-semibold text-sm">Security Warning</span>
            </div>
            <p className="text-xs leading-relaxed text-white/70">
              An unencrypted export contains all your saved passwords, secrets, and accounts in plain text.
              Anyone with access to this file can view all your credentials.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="subtle" className="flex-1" onClick={() => setShowUnencryptedWarning(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-rose-600 hover:bg-rose-500"
                onClick={() => void handleExport('unencrypted')}
                disabled={exportingFormat !== null}
              >
                Confirm Export
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Purge Vault Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <Card className="w-full max-w-sm p-4 space-y-3 border-rose-500/40">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle size={20} />
              <span className="font-semibold text-sm">Purge Vault Items</span>
            </div>
            <p className="text-xs leading-relaxed text-white/70">
              This action will permanently wipe all items, logins, secrets, and cards from your active vault.
            </p>

            <form onSubmit={handlePurgeVault} className="space-y-3">
              <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={purgeDownloadBackup}
                  onChange={(e) => setPurgeDownloadBackup(e.target.checked)}
                  className="pm-check"
                />
                <span>Download encrypted backup before purging</span>
              </label>

              <Field label="Enter Master Password to confirm">
                <Input
                  type="password"
                  value={purgeMasterPw}
                  onChange={(e) => setPurgeMasterPw(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </Field>

              {purgeError && <p className="text-xs text-rose-400">{purgeError}</p>}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="subtle"
                  className="flex-1"
                  onClick={() => setShowPurgeModal(false)}
                  disabled={purgeBusy}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 bg-rose-600 hover:bg-rose-500"
                  disabled={purgeBusy || !purgeMasterPw}
                >
                  {purgeBusy ? 'Wiping...' : 'Confirm Purge'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
