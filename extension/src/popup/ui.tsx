/** Lightweight styled primitives (shadcn-flavored) matching the dark-violet glass aesthetic. */

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown } from './icons.js';

function cx(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'subtle' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary:
      'bg-gradient-to-br from-violet-glow to-indigo-500 text-white shadow-glass hover:brightness-110',
    ghost: 'bg-white/5 text-violet-soft hover:bg-white/10 border border-white/10',
    subtle: 'text-white/60 hover:text-white',
  } as const;
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cx(
          'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90',
          'placeholder:text-white/30 outline-none focus:border-violet-soft/60 focus:bg-white/[0.07]',
          className,
        )}
        {...props}
      />
    );
  },
);

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-white/50">{children}</label>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx('glass rounded-card p-4', className)}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export interface SelectOption<T> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Themed dropdown replacing native <select> — the native option list can't be styled
 * cross-browser (it renders in the OS light theme, clashing with our dark glass UI). The menu
 * is positioned `fixed` from the trigger's rect so it escapes the popup's overflow-clipped
 * scroll container, and it flips upward if there isn't room below.
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<{ left: number; top: number; width: number; up: boolean }>({
    left: 0,
    top: 0,
    width: 0,
    up: false,
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const estHeight = Math.min(options.length * 40 + 8, 220);
    const spaceBelow = window.innerHeight - r.bottom;
    const up = spaceBelow < estHeight + 8 && r.top > spaceBelow;
    setMenu({
      left: r.left,
      top: up ? r.top - estHeight - 6 : r.bottom + 6,
      width: r.width,
      up,
    });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/90',
          'outline-none transition focus:border-violet-soft/60 hover:bg-white/[0.07]',
          open && 'border-violet-soft/60',
        )}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? 'Select…'}</span>
        <ChevronDown
          size={16}
          className={cx('shrink-0 text-white/40 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{ left: menu.left, top: menu.top, width: menu.width }}
          className="fixed z-50 max-h-[220px] overflow-y-auto rounded-xl border border-white/10 bg-ink-700/95 p-1 shadow-glass backdrop-blur-xl"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={String(o.value)}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cx(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition',
                  active ? 'bg-violet-glow/20 text-white' : 'text-white/80 hover:bg-white/10',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate">{o.label}</div>
                  {o.hint && <div className="truncate text-[11px] text-white/40">{o.hint}</div>}
                </div>
                {active && <Check size={15} className="shrink-0 text-violet-soft" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
