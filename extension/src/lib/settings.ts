/**
 * User preferences (chrome.storage.local). No secrets - just UX/security knobs: auto-lock timeout,
 * clipboard auto-clear, per-type autofill toggles, ignored websites, and default password-generator
 * options.
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

/** Per-type auto-save/auto-fill switches (Kaspersky's "Auto-Speichern und Auto-Ausfüllen für"). */
export interface AutofillPrefs {
  logins: boolean;
  identities: boolean;
  cards: boolean;
}

export interface Settings {
  autoLockMinutes: number; // 0 = never
  /** Desktop only: also lock the vault when Windows locks / the machine suspends. */
  lockOnSystemLock: boolean;
  clipboardClearSeconds: number; // 0 = never
  theme: 'dark' | 'light' | 'system'; // applied via lib/theme.ts (data-theme on <html>)
  autofill: AutofillPrefs;
  /** Hosts where we neither offer to save nor autofill anything (logins/identities/cards). */
  ignoredSites: string[];
  /** Hosts where passkey ceremonies are not intercepted/served by NextPass (extension). */
  ignoredPasskeySites: string[];
  /** Opt-in compromised-password check (HIBP k-anonymity: only the first 5 chars of a SHA-1
   *  hash ever leave the device). Off by default to preserve the strict offline posture. */
  breachCheck: boolean;
  gen: GeneratorDefaults;
}

export const DEFAULT_SETTINGS: Settings = {
  autoLockMinutes: 15,
  lockOnSystemLock: true,
  clipboardClearSeconds: 30,
  theme: 'dark',
  autofill: { logins: true, identities: true, cards: true },
  ignoredSites: [],
  ignoredPasskeySites: [],
  breachCheck: false,
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

function withDefaults(s: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    gen: { ...DEFAULT_SETTINGS.gen, ...s?.gen },
    autofill: { ...DEFAULT_SETTINGS.autofill, ...s?.autofill },
    ignoredSites: s?.ignoredSites ?? [],
    ignoredPasskeySites: s?.ignoredPasskeySites ?? [],
  };
}

export async function getSettings(): Promise<Settings> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const got = await chrome.storage.local.get(KEY);
    return withDefaults(got[KEY] as Partial<Settings> | undefined);
  }
  try {
    const raw = localStorage.getItem(KEY);
    return withDefaults(raw ? (JSON.parse(raw) as Partial<Settings>) : undefined);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings();
  const next: Settings = {
    ...cur,
    ...patch,
    gen: { ...cur.gen, ...patch.gen },
    autofill: { ...cur.autofill, ...patch.autofill },
  };
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [KEY]: next });
  } else {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }
  return next;
}

// --- ignored-website helpers -------------------------------------------------------------------

/** Normalize user input ("https://www.Foo.com/x", "www.foo.com") to a bare lowercase host. */
export function normalizeIgnoredSite(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = new URL(s).hostname;
    else s = new URL(`https://${s}`).hostname;
  } catch {
    return null;
  }
  s = s.replace(/^www\./, '');
  return s || null;
}

/** True when `url`'s host is (or is a subdomain of) any entry in `list`. */
export function isIgnoredSite(list: string[], url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    // Passkey rpIds arrive as bare hosts, not URLs.
    host = url.trim().toLowerCase().replace(/^www\./, '');
    if (!host) return false;
  }
  return list.some((d) => {
    const dom = d.trim().toLowerCase().replace(/^www\./, '');
    return dom !== '' && (host === dom || host.endsWith(`.${dom}`));
  });
}

/** What the content script is allowed to do on `url`, per settings. */
export interface AutofillPolicy {
  logins: boolean;
  identities: boolean;
  cards: boolean;
}

export function computeAutofillPolicy(settings: Settings, url: string): AutofillPolicy {
  const ignored = isIgnoredSite(settings.ignoredSites, url);
  return {
    logins: settings.autofill.logins && !ignored,
    identities: settings.autofill.identities && !ignored,
    cards: settings.autofill.cards && !ignored,
  };
}
