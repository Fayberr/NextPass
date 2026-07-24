/**
 * Theme switching (Dark / Light / System).
 *
 * The entire UI is themed through CSS variables (--pm-fg, --pm-bg, ...) declared in
 * globals.css (and mirrored in desktop/src/index.css). Tailwind's `white` color is remapped
 * to rgb(var(--pm-fg) / alpha), so applying a theme is just setting `data-theme` on <html>.
 * Dark is the default (matches the pre-theming UI exactly); System follows the OS via
 * prefers-color-scheme and reacts live to OS changes.
 *
 * The preference is persisted in Settings (settings.ts) and applied at popup startup by
 * App.tsx - it works identically in the extension popup and the Electron desktop renderer.
 */

export type ThemePref = 'dark' | 'light' | 'system';

let systemWatcher: MediaQueryList | null = null;

function setAttr(dark: boolean): void {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

/** Apply a theme preference to the document (and keep following the OS for 'system'). */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === 'undefined') return;
  if (systemWatcher) {
    systemWatcher.onchange = null;
    systemWatcher = null;
  }
  if (pref === 'system' && typeof window !== 'undefined' && window.matchMedia) {
    systemWatcher = window.matchMedia('(prefers-color-scheme: dark)');
    setAttr(systemWatcher.matches);
    systemWatcher.onchange = (e) => setAttr(e.matches);
  } else {
    setAttr(pref !== 'light');
  }
}
