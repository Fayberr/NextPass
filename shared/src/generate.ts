/**
 * Password / passphrase generation. Uses the platform CSPRNG (crypto.getRandomValues) with
 * rejection sampling so every character is drawn uniformly (no modulo bias).
 */

export interface PasswordOptions {
  length?: number;
  lowercase?: boolean;
  uppercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
  /** Exclude look-alikes (O/0, l/1/I, etc.) for easier manual typing. */
  avoidAmbiguous?: boolean;
}

const SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/',
};
const AMBIGUOUS = /[O0Il1|S5B8]/g;

/** Uniform random integer in [0, max) via rejection sampling. */
function randInt(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max; // largest multiple of max that fits in u32
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= limit);
  return x % max;
}

export function generatePassword(opts: PasswordOptions = {}): string {
  const {
    length = 20,
    lowercase = true,
    uppercase = true,
    digits = true,
    symbols = true,
    avoidAmbiguous = true,
  } = opts;

  const active: string[] = [];
  if (lowercase) active.push(SETS.lowercase);
  if (uppercase) active.push(SETS.uppercase);
  if (digits) active.push(SETS.digits);
  if (symbols) active.push(SETS.symbols);
  if (active.length === 0) active.push(SETS.lowercase); // never produce an empty alphabet

  const clean = (s: string) => (avoidAmbiguous ? s.replace(AMBIGUOUS, '') : s);
  const pools = active.map(clean).filter((p) => p.length > 0);
  const all = clean(active.join(''));

  const out: string[] = [];
  // Guarantee at least one char from each selected pool (up to the requested length).
  for (const pool of pools) {
    if (out.length >= length) break;
    out.push(pool[randInt(pool.length)]!);
  }
  while (out.length < length) out.push(all[randInt(all.length)]!);

  // Fisher–Yates shuffle so the guaranteed chars aren't stuck at the front.
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.join('');
}
