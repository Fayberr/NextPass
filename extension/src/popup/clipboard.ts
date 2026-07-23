import { send } from './client.js';

/**
 * Copy to the clipboard and (per the user's setting) overwrite it after a delay so a copied
 * password doesn't linger. Best-effort: the timer only fires while the popup document is alive,
 * which is the common case (the user copies, pastes, then closes). A background/offscreen clear
 * would be needed to survive an immediate popup close - deferred.
 */
let clearTimer: ReturnType<typeof setTimeout> | undefined;

export async function copyWithClear(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  if (clearTimer) clearTimeout(clearTimer);

  const res = await send({ kind: 'get_settings' });
  const seconds = res.ok && res.kind === 'settings' ? res.settings.clipboardClearSeconds : 0;
  if (seconds > 0) {
    clearTimer = setTimeout(() => {
      // Only clear if our value is still the one on the clipboard, to avoid nuking later copies.
      navigator.clipboard.readText().then(
        (cur) => {
          if (cur === value) void navigator.clipboard.writeText('');
        },
        () => void navigator.clipboard.writeText(''),
      );
    }, seconds * 1000);
  }
}
