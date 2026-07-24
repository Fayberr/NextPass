import { useEffect, useRef, useState } from 'react';
import { externalFaviconSources, transparentFavicon } from '../../../extension/src/lib/favicon';

interface FaviconProps {
  url?: string;
  title: string;
  size?: number;
}

/** Same shared favicon pipeline as the main vault list (see extension/src/lib/favicon.ts): tries
 *  Google then DuckDuckGo at a high resolution, skips confirmed generic "unknown domain"
 *  placeholders, flood-fills any flat white background matte to transparent, and still renders
 *  a source even when the pipeline couldn't read its pixels (e.g. DuckDuckGo sends no CORS
 *  header) - a plain `<img>` load doesn't need CORS, and its own onError advances to the next
 *  candidate if that source turns out to be genuinely broken. Keeps the quick-search overlay's
 *  icons visually consistent with the main window. */
export function Favicon({ url, title, size = 24 }: FaviconProps) {
  const [src, setSrc] = useState<string | null>(null);
  const nextRef = useRef<() => void>(() => {});

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

    let candidates: string[] = [];
    let i = 0;

    async function step() {
      if (candidates.length === 0 && i === 0) {
        candidates = await externalFaviconSources(domain);
        if (!active) return;
      }
      while (i < candidates.length) {
        const source = candidates[i++]!;
        const outcome = await transparentFavicon(source);
        if (!active) return;
        if (outcome.status === 'skip') continue;
        setSrc(outcome.src);
        return;
      }
      if (active) setSrc(null);
    }

    nextRef.current = () => void step();
    void step();

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
      onError={() => nextRef.current()}
      className="rounded-md object-contain shrink-0 bg-transparent"
      style={{ width: size, height: size }}
    />
  );
}
