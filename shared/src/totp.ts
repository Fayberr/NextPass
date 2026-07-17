/**
 * TOTP / HOTP (RFC 6238 / 4226) code generation, using WebCrypto HMAC. Supports otpauth:// URIs
 * and raw base32 secrets, SHA-1/256/512, configurable digits and period.
 */

export interface TotpParams {
  secret: string; // base32 (with or without padding/spaces)
  digits: number;
  period: number;
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512';
  issuer?: string;
  account?: string;
}

const DEFAULTS = { digits: 6, period: 30, algorithm: 'SHA-1' as const };

/** Decode an RFC 4648 base32 string (case-insensitive, ignores spaces/padding) to bytes. */
export function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.toUpperCase().replace(/[\s=]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue; // skip anything not in the alphabet
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Parse an otpauth://totp/... URI (or a bare secret) into full params. */
export function parseOtpauth(uri: string): TotpParams {
  if (!/^otpauth:\/\//i.test(uri)) {
    return { secret: uri.trim(), ...DEFAULTS };
  }
  const url = new URL(uri);
  const secret = url.searchParams.get('secret') ?? '';
  const digits = Number(url.searchParams.get('digits')) || DEFAULTS.digits;
  const period = Number(url.searchParams.get('period')) || DEFAULTS.period;
  const algRaw = (url.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();
  const algorithm = (algRaw.includes('512') ? 'SHA-512' : algRaw.includes('256') ? 'SHA-256' : 'SHA-1') as TotpParams['algorithm'];
  const label = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  const [labelIssuer, account] = label.includes(':') ? label.split(':') : [undefined, label];
  const issuer = url.searchParams.get('issuer') ?? labelIssuer;
  return { secret, digits, period, algorithm, issuer, account };
}

function hotpTruncate(hmac: Uint8Array, digits: number): string {
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (bin % 10 ** digits).toString().padStart(digits, '0');
}

/** Compute the current TOTP code + seconds remaining in the window. */
export async function generateTotp(
  params: string | TotpParams,
  now: number = Date.now(),
): Promise<{ code: string; secondsRemaining: number; period: number }> {
  const p = typeof params === 'string' ? parseOtpauth(params) : { ...DEFAULTS, ...params };
  const counter = Math.floor(now / 1000 / p.period);

  const key = base32Decode(p.secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    { name: 'HMAC', hash: p.algorithm },
    false,
    ['sign'],
  );
  const msg = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, msg));
  const code = hotpTruncate(sig, p.digits);
  const secondsRemaining = p.period - Math.floor((now / 1000) % p.period);
  return { code, secondsRemaining, period: p.period };
}

/** True if the string is a usable TOTP secret / otpauth URI. */
export function isValidTotp(input: string): boolean {
  try {
    const p = /^otpauth:/i.test(input) ? parseOtpauth(input) : { secret: input };
    return base32Decode(p.secret).length >= 10;
  } catch {
    return false;
  }
}
