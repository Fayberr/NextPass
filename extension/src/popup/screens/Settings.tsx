import { useEffect, useState } from 'react';
import { Button, Field, Input, Select, Card, Checkbox } from '../ui.js';
import {
  ArrowLeft,
  Lock,
  Download,
  Upload,
  AlertTriangle,
  ShieldCheck,
  Check,
  GoogleIcon,
  Globe,
  Monitor,
  Smartphone,
  Sun,
  Moon,
} from '../icons.js';
import { send } from '../client.js';
import { DEFAULT_SETTINGS, type Settings as SettingsType } from '../../lib/settings.js';
import { applyTheme } from '../../lib/theme.js';
import { getHelloApi, type HelloStatus } from '../../lib/hello-unlock.js';
import type { DeviceInfo } from '@pm/shared';

function platformLabel(platform: string): string {
  switch (platform) {
    case 'extension': return 'Browser extension';
    case 'desktop': return 'Desktop app';
    case 'android': return 'Android app';
    default: return platform;
  }
}

function PlatformIcon({ platform }: { platform: string }) {
  const cls = 'h-4 w-4 text-white/50';
  if (platform === 'extension') return <Globe className={cls} />;
  if (platform === 'android') return <Smartphone className={cls} />;
  return <Monitor className={cls} />;
}

/** "just now" / "12m ago" / "5h ago" / locale date - for the devices list's last-seen line. */
function fmtWhen(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ms).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Desktop-app-only section (launch on startup, quick-search hotkey). Only
// rendered inside the Electron renderer, where the preload script exposes
// `window.electronAPI` - in the browser extension popup this stays inert.
// ---------------------------------------------------------------------------

interface DesktopSettingsShape {
  launchOnStartup: boolean;
  startMinimized: boolean;
  quickSearchHotkey: string;
}

interface DesktopApi {
  desktopSettingsGet: () => Promise<DesktopSettingsShape>;
  desktopSettingsSet: (
    patch: Partial<DesktopSettingsShape>,
  ) => Promise<{ settings: DesktopSettingsShape; error: string | null }>;
}

function getDesktopApi(): DesktopApi | null {
  const api = (globalThis as { electronAPI?: Partial<DesktopApi> }).electronAPI;
  return api?.desktopSettingsGet && api.desktopSettingsSet ? (api as DesktopApi) : null;
}

/** Electron accelerator -> what a Windows user expects to read. */
function prettyAccel(accel: string): string {
  return accel.replace(/CommandOrControl|CmdOrCtrl/g, 'Ctrl').replace(/Super/g, 'Win');
}

/** Build an Electron accelerator from a keydown, or null while only modifiers are held. */
function accelFromEvent(e: KeyboardEvent): string | null {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null;
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('CommandOrControl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');
  if (mods.length === 0) return null; // require at least one modifier for a global hotkey
  const special: Record<string, string> = {
    ' ': 'Space',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  };
  const key = special[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
  return [...mods, key].join('+');
}

function DesktopSection({ api }: { api: DesktopApi }) {
  const [ds, setDs] = useState<DesktopSettingsShape | null>(null);
  const [recording, setRecording] = useState(false);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [hello, setHello] = useState<HelloStatus | null>(null);
  const [helloBusy, setHelloBusy] = useState(false);
  const [helloError, setHelloError] = useState<string | null>(null);

  useEffect(() => {
    void api.desktopSettingsGet().then(setDs).catch(() => setDs(null));
    const h = getHelloApi();
    if (h) void h.helloStatus().then(setHello).catch(() => setHello(null));
  }, []);

  /** Toggling ON shows the Windows Hello prompt right away (the enable path verifies first);
   *  toggling OFF just deletes the DPAPI blob. Both go through the shared session so the
   *  vault key itself never touches this component. */
  async function setHelloEnabled(on: boolean) {
    setHelloBusy(true);
    setHelloError(null);
    try {
      const res = await send({ kind: on ? 'enable_hello_unlock' : 'disable_hello_unlock' });
      if (!res.ok) throw new Error(res.error);
      setHello((h) => (h ? { ...h, enabled: on } : h));
    } catch (e) {
      setHelloError(e instanceof Error ? e.message : String(e));
    } finally {
      setHelloBusy(false);
    }
  }

  async function patch(p: Partial<DesktopSettingsShape>) {
    const res = await api.desktopSettingsSet(p);
    setDs(res.settings);
    setHotkeyError(res.error);
  }

  useEffect(() => {
    if (!recording) return;
    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setRecording(false);
        return;
      }
      const accel = accelFromEvent(e);
      if (accel) {
        setRecording(false);
        void patch({ quickSearchHotkey: accel });
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [recording]);

  if (!ds) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Desktop App</h2>
      <Card className="p-3 space-y-3">
        <label className="flex items-start justify-between gap-3 cursor-pointer">
          <div>
            <p className="text-xs font-medium text-white/90">Launch when Windows starts</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              Open NextPass automatically after you sign in to Windows.
            </p>
          </div>
          <Checkbox
            checked={ds.launchOnStartup}
            onChange={(v) => void patch({ launchOnStartup: v })}
            className="shrink-0 mt-0.5"
          />
        </label>

        {ds.launchOnStartup && (
          <label className="flex items-start justify-between gap-3 cursor-pointer border-t border-white/5 pt-3">
            <div>
              <p className="text-xs font-medium text-white/90">Start minimized</p>
              <p className="text-[11px] text-white/40 mt-0.5">
                Wait quietly in the taskbar instead of opening the window.
              </p>
            </div>
            <Checkbox
              checked={ds.startMinimized}
              onChange={(v) => void patch({ startMinimized: v })}
              className="shrink-0 mt-0.5"
            />
          </label>
        )}

        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-white/90">Quick-search hotkey</p>
              <p className="text-[11px] text-white/40 mt-0.5">
                Global shortcut that opens the search overlay from anywhere.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setHotkeyError(null);
                setRecording((r) => !r);
              }}
              className={`shrink-0 rounded-lg border px-3 py-1.5 font-mono text-xs transition ${
                recording
                  ? 'border-violet-400/60 bg-violet-500/15 text-violet-200 animate-pulse'
                  : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {recording ? 'Press keys…' : prettyAccel(ds.quickSearchHotkey)}
            </button>
          </div>
          {recording && (
            <p className="mt-2 text-[11px] text-white/40">
              Press the new combination (needs at least one modifier). Esc cancels.
            </p>
          )}
          {hotkeyError && <p className="mt-2 text-xs text-rose-400">{hotkeyError}</p>}
        </div>

        {hello && (
          <div className="border-t border-white/5 pt-3">
            <label className={`flex items-start justify-between gap-3 ${hello.available ? 'cursor-pointer' : 'opacity-50'}`}>
              <div>
                <p className="text-xs font-medium text-white/90">Unlock with Windows Hello</p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {hello.available
                    ? 'Use your Windows PIN, fingerprint or face to unlock the vault instead of typing the master password.'
                    : 'Windows Hello is not set up on this PC (Settings > Accounts > Sign-in options).'}
                </p>
              </div>
              <Checkbox
                checked={hello.enabled}
                onChange={(v) => void setHelloEnabled(v)}
                disabled={helloBusy || !hello.available}
                className="shrink-0 mt-0.5"
              />
            </label>
            {helloBusy && (
              <p className="mt-2 text-[11px] text-violet-300">Waiting for Windows Hello…</p>
            )}
            {helloError && <p className="mt-2 text-xs text-rose-400">{helloError}</p>}
            {hello.enabled && !helloBusy && !helloError && (
              <p className="mt-2 text-[11px] text-white/40">
                Turned off automatically when you log out or change the master password.
              </p>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

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

/** Desktop-only: the wide Electron window renders Settings as two panes (section nav on the
 *  left, one section's content on the right); the 360px popup keeps its single scroll column. */
const IS_DESKTOP = typeof navigator !== 'undefined' && /\bElectron\//.test(navigator.userAgent);

type PaneId = 'general' | 'account' | 'devices' | 'password' | 'backup' | 'danger';

const PANES: { id: PaneId; label: string; danger?: boolean }[] = [
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Google Account' },
  { id: 'devices', label: 'Connected Devices' },
  { id: 'password', label: 'Master Password' },
  { id: 'backup', label: 'Backup & Restore' },
  { id: 'danger', label: 'Danger Zone', danger: true },
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
  const desktopApi = getDesktopApi();
  const [pane, setPane] = useState<PaneId>('general');
  /** Whether a section renders: the popup shows all sections stacked, desktop only the active pane. */
  const show = (id: PaneId) => !IS_DESKTOP || pane === id;

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

  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Connected devices state
  const [devices, setDevices] = useState<DeviceInfo[] | null>(null);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function loadDevices() {
    try {
      const res = await send({ kind: 'list_devices' });
      if (res.ok && res.kind === 'devices') {
        setDevices(res.devices);
        setDevicesError(null);
      } else if (!res.ok) {
        setDevicesError(res.error || 'Could not load devices.');
      }
    } catch (err) {
      setDevicesError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRevokeDevice(d: DeviceInfo) {
    if (
      !confirm(
        `Sign out "${platformLabel(d.platform)}" (paired ${new Date(d.createdAt).toLocaleDateString()})? ` +
          'It will need the master password to pair again.',
      )
    )
      return;
    setRevokingId(d.id);
    setDevicesError(null);
    try {
      const res = await send({ kind: 'revoke_device', id: d.id });
      if (res.ok && res.kind === 'devices') setDevices(res.devices);
      else if (!res.ok) setDevicesError(res.error || 'Failed to revoke device.');
    } catch (err) {
      setDevicesError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevokingId(null);
    }
  }

  // Device-remember ("Enable Google auth only login") state
  const [deviceUnlockEnabled, setDeviceUnlockEnabled] = useState(false);
  const [deviceUnlockAvailable, setDeviceUnlockAvailable] = useState(false);
  const [deviceUnlockBusy, setDeviceUnlockBusy] = useState(false);
  const [deviceUnlockError, setDeviceUnlockError] = useState<string | null>(null);

  async function refreshState() {
    const st = await send({ kind: 'get_state' });
    if (st.ok && st.kind === 'state') {
      setGoogleEmail(st.state.googleEmail ?? null);
      setDeviceUnlockEnabled(Boolean(st.state.deviceUnlockEnabled));
      setDeviceUnlockAvailable(Boolean(st.state.deviceUnlockAvailable));
    }
  }

  useEffect(() => {
    void (async () => {
      const res = await send({ kind: 'get_settings' });
      if (res.ok && res.kind === 'settings') setS(res.settings);
      await refreshState();
      await loadDevices();
    })();
  }, []);

  async function handleToggleDeviceUnlock(next: boolean) {
    setDeviceUnlockBusy(true);
    setDeviceUnlockError(null);
    try {
      const res = await send({ kind: next ? 'enable_device_unlock' : 'forget_device' });
      if (!res.ok) throw new Error(res.error);
      await refreshState();
    } catch (err) {
      setDeviceUnlockError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeviceUnlockBusy(false);
    }
  }

  async function handleForgetDevice() {
    if (!confirm('Forget this device? You will need your master password to unlock next time.')) return;
    setDeviceUnlockBusy(true);
    setDeviceUnlockError(null);
    try {
      const res = await send({ kind: 'forget_device' });
      if (!res.ok) throw new Error(res.error);
      await refreshState();
    } catch (err) {
      setDeviceUnlockError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeviceUnlockBusy(false);
    }
  }

  async function handleLinkGoogle() {
    setGoogleBusy(true);
    setGoogleError(null);
    try {
      // See background/index.ts's 'google_signin' case: the account chooser must run in the
      // background, not here, or its own window stealing focus auto-closes this popup mid-flight.
      const gRes = await send({ kind: 'google_signin' });
      if (!gRes.ok) throw new Error(gRes.error);
      const googleUser = gRes.kind === 'google_user' ? gRes.googleUser : null;
      if (!googleUser) {
        setGoogleBusy(false);
        return;
      }
      const res = await send({
        kind: 'link_google',
        googleId: googleUser.googleId,
        googleEmail: googleUser.email,
      });

      if (!res.ok) throw new Error(res.error);
      setGoogleEmail(googleUser.email);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : String(err));
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleUnlinkGoogle() {
    if (!confirm('Are you sure you want to unlink your Google account from this vault?')) return;
    setGoogleBusy(true);
    setGoogleError(null);
    try {
      const res = await send({ kind: 'unlink_google' });
      if (!res.ok) throw new Error(res.error);
      setGoogleEmail(null);
      // Google-only unlock can't function without a linked Google account - drop it too.
      if (deviceUnlockEnabled) await send({ kind: 'forget_device' });
      await refreshState();
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : String(err));
    } finally {
      setGoogleBusy(false);
    }
  }

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

      <div className="flex min-h-0 flex-1">
        {IS_DESKTOP && (
          <nav className="w-48 shrink-0 space-y-0.5 overflow-y-auto border-r border-white/5 p-3">
            {PANES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPane(p.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-[13px] font-medium transition ${
                  pane === p.id
                    ? p.danger
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      : 'border-violet-glow/30 bg-violet-glow/15 text-violet-soft'
                    : p.danger
                      ? 'border-transparent text-rose-400/60 hover:bg-rose-500/10 hover:text-rose-300'
                      : 'border-transparent text-white/45 hover:bg-white/5 hover:text-white/75'
                }`}
              >
                {p.label}
              </button>
            ))}
          </nav>
        )}

        <div className="min-w-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Security & Lock Preferences */}
        {show('general') && (
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
        )}

        {/* Appearance */}
        {show('general') && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Appearance</h2>
          <Card className="p-3">
            <Field label="Theme">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.07] bg-white/5 p-1">
                {(
                  [
                    { value: 'dark', label: 'Dark', Icon: Moon },
                    { value: 'light', label: 'Light', Icon: Sun },
                    { value: 'system', label: 'System', Icon: Monitor },
                  ] as const
                ).map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      applyTheme(value);
                      void update({ theme: value });
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                      s.theme === value
                        ? 'bg-violet-glow/25 text-violet-soft'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                System follows your operating system's light/dark preference.
              </p>
            </Field>
          </Card>
        </section>
        )}

        {/* Desktop-only: startup + hotkey (Electron renderer only) */}
        {show('general') && desktopApi && <DesktopSection api={desktopApi} />}

        {/* Google Account */}
        {show('account') && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Google Account</h2>
          <Card className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-white/90">Sign in with Google</p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  {googleEmail ? `Linked to ${googleEmail}` : 'Link your Google account for 1-click login'}
                </p>
              </div>

              {googleEmail ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUnlinkGoogle}
                  disabled={googleBusy}
                  className="shrink-0 text-rose-400 hover:text-rose-300"
                >
                  {googleBusy ? 'Unlinking...' : 'Unlink'}
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={googleBusy}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
                >
                  <GoogleIcon />
                  <span>{googleBusy ? 'Linking...' : 'Link Google'}</span>
                </button>
              )}
            </div>
            {googleError && <p className="mt-2 text-xs text-rose-400">{googleError}</p>}
          </Card>

          {googleEmail && (
            <Card className="p-3">
              <label className="flex items-start justify-between gap-3 cursor-pointer">
                <div>
                  <p className="text-xs font-medium text-white/90">Enable Google auth only login</p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    After enabling, unlocking on <strong>this device</strong> only needs a fresh
                    Google sign-in - no master password. Your master password is still required on
                    any other device, and this is auto-forgotten if you change your master
                    password. Anyone who already has access to your unlocked, signed-in browser on
                    this device could unlock the vault this way, so only enable it on a personal
                    device you trust.
                  </p>
                </div>
                <Checkbox
                  checked={deviceUnlockEnabled}
                  onChange={(v) => void handleToggleDeviceUnlock(v)}
                  className="shrink-0 mt-0.5"
                />
              </label>
              {deviceUnlockBusy && <p className="mt-2 text-[11px] text-white/40">Working...</p>}
              {deviceUnlockError && <p className="mt-2 text-xs text-rose-400">{deviceUnlockError}</p>}

              {(deviceUnlockEnabled || deviceUnlockAvailable) && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleForgetDevice}
                  disabled={deviceUnlockBusy}
                  className="mt-3 w-full justify-center text-rose-400 hover:text-rose-300"
                >
                  Forget this Device
                </Button>
              )}
            </Card>
          )}
        </section>
        )}

        {/* Connected Devices */}
        {show('devices') && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">Connected Devices</h2>
          <Card className="p-3">
            {devices === null && !devicesError && (
              <p className="text-[11px] text-white/40">Loading devices…</p>
            )}
            {devicesError && <p className="text-xs text-rose-400">{devicesError}</p>}
            {devices !== null && devices.length === 0 && (
              <p className="text-[11px] text-white/40">No paired devices.</p>
            )}
            {devices !== null && devices.length > 0 && (
              <ul className="divide-y divide-white/5">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <PlatformIcon platform={d.platform} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-xs font-medium text-white/90">
                        {platformLabel(d.platform)}
                        {d.current && (
                          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                            This device
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/40">
                        Paired {new Date(d.createdAt).toLocaleDateString()} · Last seen {fmtWhen(d.lastSeenAt)}
                      </p>
                    </div>
                    {!d.current && (
                      <Button
                        variant="subtle"
                        onClick={() => void handleRevokeDevice(d)}
                        disabled={revokingId !== null}
                        className="shrink-0 text-rose-400 hover:text-rose-300"
                      >
                        {revokingId === d.id ? 'Revoking…' : 'Revoke'}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
        )}

        {/* Change Master Password */}
        {show('password') && (
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
        )}

        {/* Backup & Export */}
        {show('backup') && (
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
        )}

        {/* Restore & Import Backup (same pane as Backup & Export on desktop) */}
        {show('backup') && (
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
        )}

        {/* Danger Zone */}
        {show('danger') && (
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
        )}
          </div>
        </div>
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
