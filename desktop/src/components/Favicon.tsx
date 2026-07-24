import { useEffect, useState } from 'react';
import { externalFaviconSources, transparentFavicon } from '../../../extension/src/lib/favicon';

interface FaviconProps {
  url?: string;
  title: string;
  size?: number;
}

/** Same shared favicon pipeline as the main vault list (see extension/src/lib/favicon.ts): tries
 *  Google then DuckDuckGo at a high resolution, skips generic "unknown domain" placeholders, and
 *  flood-fills any flat white background matte to transparent. Keeps the quick-search overlay's
 *  icons visually consistent with the main window instead of the old plain/opaque favicon.ico. */
export function Favicon({ url, title, size = 24 }: FaviconProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSrc(null);
    if (!url) return;

    let domain: string;
    try {
      domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    } catch {
      return;
    }

    async function load() {
      for (const source of externalFaviconSources(domain)) {
        const { src: resolved, ok } = await transparentFavicon(source);
        if (!active) return;
        if (ok) {
          setSrc(resolved);
          return;
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [url]);

  if (!src) {
    return (
      <div
        className="rounded-md bg-white/10 text-white/50 border border-white/10 flex items-center justify-center font-bold uppercase shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {title.charAt(0) || '?'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className="rounded-md object-contain shrink-0 bg-transparent"
      style={{ width: size, height: size }}
    />
  );
}
