import { useState } from 'react';
import { Globe } from './icons';

interface FaviconProps {
  url?: string;
  title: string;
  size?: number;
}

export function Favicon({ url, title, size = 24 }: FaviconProps) {
  const [stage, setStage] = useState<number>(0);

  if (!url) {
    return (
      <div
        className="rounded-md bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center font-bold uppercase shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {title.charAt(0) || '?'}
      </div>
    );
  }

  let domain = url;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    domain = parsed.hostname;
  } catch {}

  const sources = [
    `https://${domain}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];

  if (stage >= sources.length) {
    return (
      <div
        className="rounded-md bg-zinc-800 text-zinc-400 border border-white/10 flex items-center justify-center font-bold uppercase shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {title.charAt(0) || '?'}
      </div>
    );
  }

  return (
    <img
      src={sources[stage]}
      alt={title}
      onError={() => setStage((prev) => prev + 1)}
      className="rounded-md object-contain shrink-0 bg-transparent"
      style={{ width: size, height: size }}
    />
  );
}
