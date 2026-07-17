import { describe, it, expect } from 'vitest';
import { cborEncode, U, N, T, B } from '../src/cbor.js';
import { createPasskey, signAssertion, b64url, AAGUID } from '../src/webauthn.js';
import { sha256, utf8, randomBytes } from '../src/crypto.js';

const subtle = globalThis.crypto.subtle;
const ECDSA_SHA256 = { name: 'ECDSA', hash: 'SHA-256' } as const;

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** Reconstruct the SEC1 raw public key from our deterministic COSE_Key encoding, then import it. */
async function importPubFromCose(cose: Uint8Array): Promise<CryptoKey> {
  // Layout (see coseKeyFromRaw): x @ [10,42), y @ [45,77).
  const x = cose.slice(10, 42);
  const y = cose.slice(45, 77);
  const raw = concat([new Uint8Array([0x04]), x, y]);
  return subtle.importKey('raw', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
}

/** DER ECDSA signature → raw r‖s (P-256), for WebCrypto verification. */
function derToRaw(der: Uint8Array): Uint8Array {
  let o = 2; // skip SEQUENCE tag + length
  const readInt = (): Uint8Array => {
    o++; // 0x02
    const len = der[o]!;
    o++;
    const v = der.slice(o, o + len);
    o += len;
    return v;
  };
  const pad = (v: Uint8Array): Uint8Array => {
    let x = v;
    if (x.length > 32) x = x.slice(x.length - 32); // drop DER's leading zero
    const p = new Uint8Array(32);
    p.set(x, 32 - x.length);
    return p;
  };
  const r = readInt();
  const s = readInt();
  return concat([pad(r), pad(s)]);
}

describe('CBOR encoder', () => {
  it('encodes ints, negatives, text and empty map to canonical bytes', () => {
    expect([...cborEncode(U(0))]).toEqual([0x00]);
    expect([...cborEncode(U(23))]).toEqual([0x17]);
    expect([...cborEncode(U(24))]).toEqual([0x18, 0x18]);
    expect([...cborEncode(U(255))]).toEqual([0x18, 0xff]);
    expect([...cborEncode(U(256))]).toEqual([0x19, 0x01, 0x00]);
    expect([...cborEncode(N(-7))]).toEqual([0x26]); // ES256 alg id
    expect([...cborEncode(T('fmt'))]).toEqual([0x63, 0x66, 0x6d, 0x74]);
    expect([...cborEncode({ map: [] })]).toEqual([0xa0]);
    expect([...cborEncode(B(new Uint8Array([1, 2])))]).toEqual([0x42, 1, 2]);
  });
});

describe('virtual FIDO2 authenticator', () => {
  const rpId = 'github.com';
  const origin = 'https://github.com';

  it('create() produces a well-formed attestationObject + clientDataJSON', async () => {
    const challenge = randomBytes(32);
    const userHandle = randomBytes(16);
    const { passkey, response } = await createPasskey({ rpId, origin, challenge, userHandle });

    // attestationObject is a CBOR map of 3 (fmt, attStmt, authData).
    expect(response.attestationObject[0]).toBe(0xa3);

    // clientDataJSON round-trips with the expected fields.
    const cd = JSON.parse(new TextDecoder().decode(response.clientDataJSON));
    expect(cd.type).toBe('webauthn.create');
    expect(cd.origin).toBe(origin);
    expect(cd.challenge).toBe(b64url(challenge));

    expect(passkey.credentialId).toHaveLength(32);
    expect(passkey.signCount).toBe(0);
    expect(AAGUID).toHaveLength(16);
  });

  it('get() assertion verifies against the created passkey public key (full round-trip)', async () => {
    const challenge = randomBytes(32);
    const userHandle = randomBytes(16);
    const created = await createPasskey({ rpId, origin, challenge, userHandle });

    const pub = await importPubFromCose(created.response.publicKeyCose);

    const getChallenge = randomBytes(32);
    const assertion = await signAssertion({ rpId, origin, challenge: getChallenge }, created.passkey);

    // The RP verifies signature over authenticatorData ‖ SHA-256(clientDataJSON).
    const clientDataHash = await sha256(assertion.clientDataJSON);
    const signedBytes = concat([assertion.authenticatorData, clientDataHash]);
    const rawSig = derToRaw(assertion.signature);

    const ok = await subtle.verify(ECDSA_SHA256, pub, rawSig, signedBytes);
    expect(ok).toBe(true);

    // authenticatorData begins with SHA-256(rpId).
    const rpIdHash = await sha256(utf8(rpId));
    expect([...assertion.authenticatorData.slice(0, 32)]).toEqual([...rpIdHash]);

    // sign counter incremented; userHandle round-tripped.
    expect(assertion.newSignCount).toBe(1);
    expect([...assertion.userHandle]).toEqual([...userHandle]);

    // A tampered signature must fail.
    const bad = rawSig.slice();
    bad[0] ^= 0xff;
    expect(await subtle.verify(ECDSA_SHA256, pub, bad, signedBytes)).toBe(false);
  });

  it('assertion for the wrong origin yields a different clientDataJSON', async () => {
    const challenge = randomBytes(32);
    const created = await createPasskey({ rpId, origin, challenge, userHandle: randomBytes(16) });
    const a = await signAssertion({ rpId, origin, challenge }, created.passkey);
    const b = await signAssertion({ rpId, origin: 'https://evil.com', challenge }, created.passkey);
    expect(new TextDecoder().decode(a.clientDataJSON)).not.toBe(
      new TextDecoder().decode(b.clientDataJSON),
    );
  });
});
