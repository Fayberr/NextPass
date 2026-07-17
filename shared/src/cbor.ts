/**
 * Minimal CBOR *encoder* — just enough for WebAuthn (attestationObject + COSE public keys).
 * WebAuthn never needs us to decode CBOR (clientDataJSON is JSON; assertion responses are raw
 * bytes), so a tiny dependency-free encoder beats pulling in a full CBOR library.
 *
 * Supports: unsigned ints, negative ints, byte strings, text strings, arrays, maps.
 */

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Encode the major-type + argument header (handles 1/2/4/8-byte extended lengths). */
function head(major: number, n: number): Uint8Array {
  const mt = major << 5;
  if (n < 24) return new Uint8Array([mt | n]);
  if (n < 0x100) return new Uint8Array([mt | 24, n]);
  if (n < 0x10000) return new Uint8Array([mt | 25, (n >> 8) & 0xff, n & 0xff]);
  if (n < 0x100000000)
    return new Uint8Array([mt | 26, (n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
  // 64-bit length (unlikely for our payloads, but correct).
  const hi = Math.floor(n / 0x100000000);
  const lo = n >>> 0;
  return new Uint8Array([
    mt | 27,
    (hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff,
    (lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff,
  ]);
}

export type CborValue =
  | { uint: number }
  | { nint: number } // the actual negative number, e.g. -7
  | { bytes: Uint8Array }
  | { text: string }
  | { array: CborValue[] }
  | { map: Array<[CborValue, CborValue]> };

export function cborEncode(v: CborValue): Uint8Array {
  if ('uint' in v) return head(0, v.uint);
  if ('nint' in v) return head(1, -1 - v.nint); // major type 1 encodes -1 - n
  if ('bytes' in v) return concat([head(2, v.bytes.length), v.bytes]);
  if ('text' in v) {
    const b = new TextEncoder().encode(v.text);
    return concat([head(3, b.length), b]);
  }
  if ('array' in v) return concat([head(4, v.array.length), ...v.array.map(cborEncode)]);
  // map
  const pairs = v.map.flatMap(([k, val]) => [cborEncode(k), cborEncode(val)]);
  return concat([head(5, v.map.length), ...pairs]);
}

// Convenience constructors.
export const U = (n: number): CborValue => ({ uint: n });
export const N = (n: number): CborValue => ({ nint: n });
export const B = (b: Uint8Array): CborValue => ({ bytes: b });
export const T = (s: string): CborValue => ({ text: s });
