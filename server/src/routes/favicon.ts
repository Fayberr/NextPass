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
 * No auth required: this only proxies public, non-identifying favicon bytes for a domain name
 * the caller already supplies, same trust level as loading the icon directly in an <img> tag.
 */
export async function faviconRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { domain?: string } }>('/api/favicon', async (req, reply) => {
    const domain = req.query.domain?.trim();
    if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) {
      return reply.status(400).send({ error: 'invalid domain' });
    }

    const sources = [
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`,
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
    ];

    for (const url of sources) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (NextPass favicon proxy)' },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 60) continue; // implausibly tiny - almost certainly a placeholder stub
        reply.header('Content-Type', res.headers.get('content-type') || 'image/x-icon');
        reply.header('Cache-Control', 'public, max-age=604800'); // 7d - icons rarely change
        return reply.status(200).send(buf);
      } catch {
        // network error / timeout - try the next source
      }
    }

    return reply.status(404).send({ error: 'not found' });
  });
}
