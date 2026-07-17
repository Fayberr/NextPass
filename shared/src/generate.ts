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

// A short, memorable EFF-style word list subset (kept compact; ~140 common words). Good enough for
// readable passphrases without shipping the full 7776-word list. Each word ≈ 7 bits of entropy.
const WORDS =
  'able acid aged also apex aqua arch atom aunt bail bake bald bank bard barn bath bead beam bean bear beat beef best bird blue boat bold bolt bone book boss bulk bump bunk bush cage cake calm camp cane cash cave cell chef chin chip chop city clam claw clay clip club coal coat code coil coin cola cold cook cool cope copy cork corn cost cove crab crew crop cube curl dark dawn deal deer desk dial dice dime dirt dish dock does dome door dove drum dual duck dusk dust each earn east easy edge fair fall farm fast fern film fine fire fish five flag flat flip flow foam fold food fork fuel gate gear gift glad goat gold golf good gray grid grip hall hand hawk heat herb hero hill hint hope horn host hour idea iron item jade jazz join jump kelp keen kept kick kind king kite knee knot lace lake lamp land lawn leaf leap lens lime line lion loft loop luck lung mall mango maple march mask mate math maze mesh mint mist mode moon moss moth navy neat nest node noon note oak oath oats onyx opal open oval oven owl page pale palm park path peak pear peel pine pint plum poem pond pony pool port post pump pure quilt rain ramp reef rice ring road rock rope rose ruby rush sage sail salt sand seal seed self ship shop silk silo sky slot snow soap sock soft soil solo song sort soup star stem step swan tail tale tank tape teal tent tide tile tint toad tone tool tree tuna twin vase vast vibe view vine wave wing wolf wood yarn yoga zero zone'.split(
    ' ',
  );

export interface PassphraseOptions {
  words?: number;
  separator?: string;
  capitalize?: boolean;
  /** Append a random 2-digit number for sites that demand a digit. */
  number?: boolean;
}

export function generatePassphrase(opts: PassphraseOptions = {}): string {
  const { words = 4, separator = '-', capitalize = true, number = true } = opts;
  const parts: string[] = [];
  for (let i = 0; i < words; i++) {
    let w = WORDS[randInt(WORDS.length)]!;
    if (capitalize) w = w[0]!.toUpperCase() + w.slice(1);
    parts.push(w);
  }
  let out = parts.join(separator);
  if (number) out += separator + (10 + randInt(90)).toString();
  return out;
}
