/**
 * User preferences (chrome.storage.local). No secrets — just UX/security knobs: auto-lock timeout,
 * clipboard auto-clear, and default password-generator options.
 */

export interface GeneratorDefaults {
  mode: 'password' | 'passphrase';
  length: number;
  digits: boolean;
  symbols: boolean;
  uppercase: boolean;
  avoidAmbiguous: boolean;
  words: number;
}

export interface Settings {
  autoLockMinutes: number; // 0 = never
  clipboardClearSeconds: number; // 0 = never
  gen: GeneratorDefaults;
}

export const DEFAULT_SETTINGS: Settings = {
  autoLockMinutes: 15,
  clipboardClearSeconds: 30,
  gen: {
    mode: 'password',
    length: 20,
    digits: true,
    symbols: true,
    uppercase: true,
    avoidAmbiguous: true,
    words: 4,
  },
};

const KEY = 'pm.settings';

export async function getSettings(): Promise<Settings> {
  const got = await chrome.storage.local.get(KEY);
  const s = got[KEY] as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...s, gen: { ...DEFAULT_SETTINGS.gen, ...s?.gen } };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings();
  const next: Settings = { ...cur, ...patch, gen: { ...cur.gen, ...patch.gen } };
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}
