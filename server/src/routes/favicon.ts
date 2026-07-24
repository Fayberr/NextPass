import type { FastifyInstance } from 'fastify';

/**
 * Public favicon proxy.
 *
 * Google's and DuckDuckGo's favicon CDNs both send no Access-Control-Allow-Origin header, so a
 * browser/Electron-renderer `fetch()` straight to them always throws (confirmed against
 * production response headers on 2026-07-24 - Google's `s2/favicons` endpoint has zero CORS
 * headers at all). That means the client-side favicon pipeline (extension/src/lib/favicon.ts)
 * could never actually read pixel data to strip background mattes - every icon silently fell
 * back to the untouched 'raw' path, which is indistinguishable from doing nothing.
 *
 * Fixed by proxying the fetch server-side (Node has no CORS concept - it's a browser-only
 * restriction) and re-serving the bytes with our own permissive CORS headers (already applied
 * globally in app.ts's onRequest hook) so the client's `fetch()` + canvas pixel-read pipeline
 * can actually run.
 *
 * v0.20.5: also fixes blurriness. Google/DuckDuckGo frequently only *have* a small native icon
 * (e.g. spotify.com's real favicon is 57x57 - `sz=256` doesn't invent resolution that isn't
 * there), so the UI ends up CSS-upscaling a tiny bitmap. Verified with real probes (2026-07-24)
 * that a site's own `apple-touch-icon.png`/`-precomposed.png` is very often much bigger (twitch
 * 180x180, tiktok 400x400, github 120x120) - so those are tried in parallel alongside Google/DDG
 * and whichever image is *actually* the highest resolution wins, not just whichever answers
 * first. Some sites 200-respond with an HTML error page instead of 404ing for these paths
 * (instagram.com does), so candidates are validated by real image-format magic bytes, not just
 * Content-Type/status.
 *
 * No auth required: this only proxies public, non-identifying favicon bytes for a domain name
 * the caller already supplies, same trust level as loading the icon directly in an <img> tag.
 */

interface Dims {
  width: number;
  height: number;
}

/** Sniffs the real image format from magic bytes - some servers 200-respond with an HTML error
 *  page for a guessed path like /apple-touch-icon.png instead of 404ing, so Content-Type/status
 *  alone can't be trusted. */
function sniffImageType(buf: Buffer): 'png' | 'ico' | 'gif' | 'jpeg' | 'webp' | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 4 && buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return 'ico';
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

function pngSize(buf: Buffer): Dims | null {
  if (buf.length < 24) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function icoSize(buf: Buffer): Dims | null {
  if (buf.length < 6) return null;
  const count = buf.readUInt16LE(4);
  let maxW = 0;
  let maxH = 0;
  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16;
    if (off + 16 > buf.length) break;
    const w = buf[off] === 0 ? 256 : (buf[off] ?? 0);
    const h = buf[off + 1] === 0 ? 256 : (buf[off + 1] ?? 0);
    if (w > maxW) maxW = w;
    if (h > maxH) maxH = h;
  }
  return maxW > 0 ? { width: maxW, height: maxH } : null;
}

function gifSize(buf: Buffer): Dims | null {
  if (buf.length < 10) return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

/** Best-effort dimensions for ranking candidates by actual resolution. JPEG/WEBP dimension
 *  parsing isn't worth a dependency for this - they're rare for favicons - so they get a
 *  moderate default weight (usable, but a measured PNG/ICO/GIF that's bigger wins). */
function measure(buf: Buffer, type: ReturnType<typeof sniffImageType>): number {
  switch (type) {
    case 'png':
      return pngSize(buf)?.width ?? 0;
    case 'ico':
      return icoSize(buf)?.width ?? 0;
    case 'gif':
      return gifSize(buf)?.width ?? 0;
    case 'jpeg':
    case 'webp':
      return 96; // unknown but plausible - a certain, measured candidate outranks this
    default:
      return 0;
  }
}

interface Candidate {
  buf: Buffer;
  contentType: string;
  width: number;
}

async function fetchCandidate(url: string): Promise<Candidate | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (NextPass favicon proxy)' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 60) return null; // implausibly tiny - almost certainly a placeholder stub
    const type = sniffImageType(buf);
    if (!type) return null; // some hosts 200 an HTML error page for a guessed icon path
    return { buf, contentType: `image/${type === 'ico' ? 'x-icon' : type}`, width: measure(buf, type) };
  } catch {
    return null; // network error / timeout - just not a usable candidate
  }
}

// Short in-memory cache so a vault with many items doesn't re-fan-out up to 4 upstream requests
// per icon on every popup open. Not persisted across restarts - that's fine, it's just a
// perf/politeness cache, not a source of truth.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { candidate: Candidate | null; expires: number }>();

export async function faviconRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { domain?: string } }>('/api/favicon', async (req, reply) => {
    const domain = req.query.domain?.trim();
    if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) {
      return reply.status(400).send({ error: 'invalid domain' });
    }

    const cached = cache.get(domain);
    const best =
      cached && cached.expires > Date.now()
        ? cached.candidate
        : await (async () => {
            const sources = [
              `https://${domain}/apple-touch-icon.png`,
              `https://${domain}/apple-touch-icon-precomposed.png`,
              `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`,
              `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
            ];
            const results = await Promise.all(sources.map(fetchCandidate));
            const winner = results
              .filter((c): c is Candidate => c !== null)
              .sort((a, b) => b.width - a.width)[0] ?? null;
            cache.set(domain, { candidate: winner, expires: Date.now() + CACHE_TTL_MS });
            return winner;
          })();

    if (!best) return reply.status(404).send({ error: 'not found' });

    reply.header('Content-Type', best.contentType);
    reply.header('Cache-Control', 'public, max-age=604800'); // 7d - icons rarely change
    return reply.status(200).send(best.buf);
  });
}
