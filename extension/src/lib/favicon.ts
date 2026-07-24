/**
 * Shared favicon fetching + background-transparency pipeline.
 *
 * Used by both the main vault list (popup/screens/VaultList.tsx, shared by the extension popup
 * and the desktop main window) and the desktop quick-search overlay (desktop/src/components/
 * Favicon.tsx), so every surface gets the same treatment:
 *  - a real icon (Google/DuckDuckGo both return HTTP 200 with a generic placeholder for unknown
 *    domains instead of 404ing, so a plain onError fallback chain silently gets stuck on that
 *    placeholder forever - this module detects and skips those instead),
 *  - requested at a high enough size to not look blurry when scaled up in the UI, and
 *  - with any flat white/near-white background matte flood-filled to transparent, without
 *    touching white pixels that are part of the logo's own artwork (those aren't connected to
 *    the edge through other background pixels, so the flood-fill never reaches them).
 */

/** External favicon CDNs to try, in order. Both send permissive CORS headers, so we can pull
 *  pixel data into a canvas for the transparency pass - a bare `<img src=".../favicon.ico">`
 *  fetched directly from the site itself usually can't (no CORS header -> tainted canvas). */
export function externalFaviconSources(domain: string): string[] {
  return [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
  ];
}

interface FaviconResult {
  src: string;
  ok: boolean;
}

const cache = new Map<string, FaviconResult>();

function closeTo(r: number, g: number, b: number, tr: number, tg: number, tb: number, tol: number): boolean {
  return Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol;
}

/**
 * Fetch `rawUrl` and, if it has a flat light background touching the image edges, flood-fill
 * that matte to transparent. Returns `ok: false` (falling back to `rawUrl` untouched as `src`)
 * when the fetch fails, the response is implausibly tiny, or - after stripping the background -
 * almost nothing is left opaque, since that's the signature of a generic "unknown site"
 * placeholder rather than a real favicon. Callers should try the next source when `ok` is false.
 */
export async function transparentFavicon(rawUrl: string): Promise<FaviconResult> {
  const cached = cache.get(rawUrl);
  if (cached) return cached;

  const fail: FaviconResult = { src: rawUrl, ok: false };

  try {
    const res = await fetch(rawUrl);
    if (!res.ok) {
      cache.set(rawUrl, fail);
      return fail;
    }
    const blob = await res.blob();
    // Google/DDG's generic "unknown domain" placeholders are tiny; a real favicon never is.
    if (blob.size < 60) {
      cache.set(rawUrl, fail);
      return fail;
    }

    const bitmap = await createImageBitmap(blob);
    const w = bitmap.width;
    const h = bitmap.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      cache.set(rawUrl, fail);
      return fail;
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
      cache.set(rawUrl, fail);
      return fail;
    }

    const result: FaviconResult = { src: canvas.toDataURL('image/png'), ok: true };
    cache.set(rawUrl, result);
    return result;
  } catch {
    cache.set(rawUrl, fail);
    return fail;
  }
}
