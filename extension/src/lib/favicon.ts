/**
 * Shared favicon fetching + background-transparency pipeline.
 *
 * Used by both the main vault list (popup/screens/VaultList.tsx, shared by the extension popup
 * and the desktop main window) and the desktop quick-search overlay (desktop/src/components/
 * Favicon.tsx), so every surface gets the same treatment:
 *  - a real icon (Google/DuckDuckGo both return HTTP 200 with a generic placeholder for unknown
 *    domains instead of 404ing, so a plain onError fallback chain silently gets stuck on that
 *    placeholder forever - this module detects and skips those instead),
 *  - requested at a high enough size to not look blurry when scaled up in the UI,
 *  - with any flat white/near-white background matte flood-filled to transparent, without
 *    touching white pixels that are part of the logo's own artwork (those aren't connected to
 *    the edge through other background pixels, so the flood-fill never reaches them), and
 *  - routed through our own server's `/api/favicon` proxy rather than fetched directly from
 *    Google/DuckDuckGo - confirmed 2026-07-24 that NEITHER of those CDNs sends an
 *    Access-Control-Allow-Origin header, so a renderer-side `fetch()` straight to them always
 *    throws (CORS), meaning the pixel-read/background-strip step could never actually run and
 *    every icon silently fell back to being displayed completely unprocessed. The server has no
 *    CORS restriction (it's a Node process, not a browser) and re-serves the bytes with our own
 *    permissive CORS headers, so the client pipeline below can finally read real pixel data.
 */

import { DEFAULT_SERVER_URL, getAccount } from './config.js';

/** Our own server's favicon proxy (see server/src/routes/favicon.ts) - it tries Google then
 *  DuckDuckGo server-side and re-serves whichever succeeds with CORS headers we control. */
export async function externalFaviconSources(domain: string): Promise<string[]> {
  let base = DEFAULT_SERVER_URL;
  try {
    const account = await getAccount();
    if (account?.serverUrl) base = account.serverUrl;
  } catch {
    // no chrome.storage context (e.g. tests) - fall back to the default
  }
  return [`${base}/api/favicon?domain=${encodeURIComponent(domain)}`];
}

export interface FaviconOutcome {
  src: string;
  /**
   * - 'transparent': fetched, decoded, and (if needed) background-stripped successfully - safe
   *   to render as-is.
   * - 'raw': couldn't read pixel data (most often a CORS-less source like DuckDuckGo, where
   *   `fetch()` itself throws) - render `src` directly via `<img>` anyway; that doesn't need
   *   CORS, and if the resource genuinely doesn't exist the `<img>`'s own onError will still
   *   fire so the caller can move on to the next source.
   * - 'skip': fetched fine but it's almost certainly a generic "unknown domain" placeholder
   *   (implausibly tiny response, or nothing left opaque after stripping the background) -
   *   don't render this at all, go straight to the next source.
   */
  status: 'transparent' | 'raw' | 'skip';
}

const cache = new Map<string, FaviconOutcome>();

function closeTo(r: number, g: number, b: number, tr: number, tg: number, tb: number, tol: number): boolean {
  return Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol;
}

export async function transparentFavicon(rawUrl: string): Promise<FaviconOutcome> {
  const cached = cache.get(rawUrl);
  if (cached) return cached;

  const raw: FaviconOutcome = { src: rawUrl, status: 'raw' };
  const skip: FaviconOutcome = { src: rawUrl, status: 'skip' };

  try {
    const res = await fetch(rawUrl);
    if (!res.ok) {
      cache.set(rawUrl, skip);
      return skip;
    }
    const blob = await res.blob();
    // Google/DDG's generic "unknown domain" placeholders are tiny; a real favicon never is.
    if (blob.size < 60) {
      cache.set(rawUrl, skip);
      return skip;
    }

    const bitmap = await createImageBitmap(blob);
    const w = bitmap.width;
    const h = bitmap.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      cache.set(rawUrl, raw);
      return raw;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const idx = (x: number, y: number) => (y * w + x) * 4;

    // Seed background color = average of the 4 true corners.
    const corners = [idx(0, 0), idx(w - 1, 0), idx(0, h - 1), idx(w - 1, h - 1)];
    let cr = 0;
    let cg = 0;
    let cb = 0;
    for (const c of corners) {
      cr += data[c] ?? 0;
      cg += data[c + 1] ?? 0;
      cb += data[c + 2] ?? 0;
    }
    cr /= 4;
    cg /= 4;
    cb /= 4;
    const bgIsLight = cr >= 225 && cg >= 225 && cb >= 225;

    if (bgIsLight) {
      const TOL = 18;
      const visited = new Uint8Array(w * h);
      const stack: number[] = [];

      const tryPush = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const p = y * w + x;
        if (visited[p]) return;
        visited[p] = 1;
        const i = p * 4;
        if (data[i + 3] === 0) return; // already transparent
        if (closeTo(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0, cr, cg, cb, TOL)) {
          data[i + 3] = 0;
          stack.push(x, y);
        }
      };

      for (let x = 0; x < w; x++) {
        tryPush(x, 0);
        tryPush(x, h - 1);
      }
      for (let y = 0; y < h; y++) {
        tryPush(0, y);
        tryPush(w - 1, y);
      }
      while (stack.length) {
        const y = stack.pop()!;
        const x = stack.pop()!;
        tryPush(x + 1, y);
        tryPush(x - 1, y);
        tryPush(x, y + 1);
        tryPush(x, y - 1);
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // "Looks empty" heuristic: if almost nothing is left opaque after stripping the matte, this
    // was very likely a generic placeholder rather than the site's real favicon.
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if ((data[i] ?? 0) > 10) opaque++;
    }
    if (opaque / (w * h) < 0.015) {
      cache.set(rawUrl, skip);
      return skip;
    }

    const result: FaviconOutcome = { src: canvas.toDataURL('image/png'), status: 'transparent' };
    cache.set(rawUrl, result);
    return result;
  } catch {
    // fetch()/decode threw - almost always a CORS-less source (no Access-Control-Allow-Origin
    // header, e.g. DuckDuckGo's icon CDN) rather than a genuinely missing resource. We can't
    // reliably tell the difference, so fall back to displaying the raw URL directly: plain
    // `<img>` loading doesn't require CORS, and a real 404 still gets caught by the caller's
    // onError handler on that image.
    cache.set(rawUrl, raw);
    return raw;
  }
}
