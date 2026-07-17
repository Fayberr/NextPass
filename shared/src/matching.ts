/**
 * URI match detection — the deliberate fix for the Kaspersky `*.fayber.dev` collision.
 * Default is **Host** (exact hostname), so every subdomain is a separate credential unless the
 * user explicitly opts an item into Base-domain matching.
 */

export type MatchMode = 'host' | 'base_domain' | 'exact' | 'never';

export const DEFAULT_MATCH_MODE: MatchMode = 'host';

/** Minimal multi-part public-suffix set (approximation; full PSL is overkill for this scale). */
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.jp',
  'com.br', 'co.za',
]);

function safeUrl(input: string): URL | null {
  try {
    return new URL(input.includes('://') ? input : `https://${input}`);
  } catch {
    return null;
  }
}

/** Registrable base domain, e.g. `ai.fayber.dev` -> `fayber.dev`, `x.co.uk` -> `x.co.uk`. */
export function baseDomain(hostname: string): string {
  const labels = hostname.toLowerCase().split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const lastTwo = labels.slice(-2).join('.');
  if (MULTI_PART_SUFFIXES.has(lastTwo)) return labels.slice(-3).join('.');
  return lastTwo;
}

/** Does a stored item URI match the page URL under the given mode? */
export function uriMatches(storedUri: string, pageUrl: string, mode: MatchMode): boolean {
  if (mode === 'never') return false;
  const a = safeUrl(storedUri);
  const b = safeUrl(pageUrl);
  if (!a || !b) return false;

  switch (mode) {
    case 'exact':
      // origin + path (ignore query/hash noise)
      return a.origin === b.origin && a.pathname.replace(/\/$/, '') === b.pathname.replace(/\/$/, '');
    case 'base_domain':
      return baseDomain(a.hostname) === baseDomain(b.hostname);
    case 'host':
    default:
      return a.hostname.toLowerCase() === b.hostname.toLowerCase();
  }
}

/** True if ANY of the item's URIs match the page under the item's mode. */
export function itemMatchesUrl(uris: string[], mode: MatchMode, pageUrl: string): boolean {
  if (mode === 'never') return false;
  return uris.some((u) => uriMatches(u, pageUrl, mode));
}
