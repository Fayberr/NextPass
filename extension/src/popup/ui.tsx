/** Lightweight styled primitives (shadcn-flavored) matching the dark-violet glass aesthetic. */

import { type ButtonHTMLAttributes, type InputHTMLAttributes, forwardRef } from 'react';

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
