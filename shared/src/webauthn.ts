/**
 * Virtual FIDO2 / WebAuthn authenticator — the crypto core of Phase 2. Browser-independent and
 * fully unit-testable: given a challenge/rpId/origin it produces the exact byte structures a
 * relying party expects from `navigator.credentials.create()` / `.get()`.
 *
 * Passkeys are ECDSA P-256 (ES256 / COSE alg -7). Attestation format is "none" (self-hosted;
 * no attestation CA). The private key is exported as PKCS#8 and stored, wrapped, as a vault item.
 */

import { fromB64, randomBytes, sha256, toB64, utf8 } from './crypto.js';
import { B, N, T, U, cborEncode, type CborValue } from './cbor.js';

/** Our authenticator's fixed AAGUID (16 bytes). Identifies "Password Manager" passkeys. */
export const AAGUID = new Uint8Array([
  0x70, 0x6d, 0x66, 0x61, 0x79, 0x62, 0x65, 0x72, 0x76, 0x61, 0x75, 0x6c, 0x74, 0x30, 0x30, 0x31,
]); // "pmfaybervault001"

const FLAG_UP = 0x01; // user present
const FLAG_UV = 0x04; // user verified
const FLAG_AT = 0x40; // attested credential data included

// --- base64url (WebAuthn clientDataJSON uses unpadded base64url) ---
export function b64url(bytes: Uint8Array): string {
  return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a base64url (or plain base64) string back to bytes. */
export function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return fromB64(b64 + pad);
}

// --- small byte helpers ---
function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function u16(n: number): Uint8Array {
  return new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
}
function u32(n: number): Uint8Array {
  return new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

const subtle = globalThis.crypto.subtle;
const EC = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ECDSA_SHA256 = { name: 'ECDSA', hash: 'SHA-256' } as const;

/** COSE_Key for an EC2 P-256 public key from its raw (0x04‖x‖y) SEC1 form. */
function coseKeyFromRaw(raw: Uint8Array): Uint8Array {
  const x = raw.slice(1, 33);
  const y = raw.slice(33, 65);
  const map: CborValue = {
    map: [
      [U(1), U(2)], // kty: EC2
      [U(3), N(-7)], // alg: ES256
      [N(-1), U(1)], // crv: P-256
      [N(-2), B(x)], // x
      [N(-3), B(y)], // y
    ],
  };
  return cborEncode(map);
}

/** authenticatorData = rpIdHash(32) ‖ flags(1) ‖ signCount(4) ‖ [attestedCredentialData]. */
async function authenticatorData(
  rpId: string,
  flags: number,
  signCount: number,
  attestedCredentialData?: Uint8Array,
): Promise<Uint8Array> {
  const rpIdHash = await sha256(utf8(rpId));
  const parts = [rpIdHash, new Uint8Array([flags]), u32(signCount)];
  if (attestedCredentialData) parts.push(attestedCredentialData);
  return concat(parts);
}

function clientDataJSON(type: 'webauthn.create' | 'webauthn.get', challenge: Uint8Array, origin: string): Uint8Array {
  // Key order matches what browsers emit; RPs parse by key, but we keep it conventional.
  return utf8(
    JSON.stringify({ type, challenge: b64url(challenge), origin, crossOrigin: false }),
  );
}

/** Convert WebCrypto's raw (r‖s, 64-byte) ECDSA signature to the ASN.1 DER WebAuthn expects. */
function rawSigToDer(raw: Uint8Array): Uint8Array {
  const der = (x: Uint8Array): Uint8Array => {
    let i = 0;
    while (i < x.length - 1 && x[i] === 0) i++; // strip leading zeros
    let v = x.slice(i);
    if ((v[0]! & 0x80) !== 0) v = concat([new Uint8Array([0]), v]); // keep it positive
    return concat([new Uint8Array([0x02, v.length]), v]);
  };
  const r = der(raw.slice(0, 32));
  const s = der(raw.slice(32, 64));
  return concat([new Uint8Array([0x30, r.length + s.length]), r, s]);
}

// ---------------------------------------------------------------------------
// create() — register a new passkey
// ---------------------------------------------------------------------------

export interface CreatePasskeyRequest {
  rpId: string; // e.g. "github.com"
  origin: string; // e.g. "https://github.com"
  challenge: Uint8Array;
  userHandle: Uint8Array; // PublicKeyCredentialUserEntity.id
  userName?: string;
  userDisplayName?: string;
}

/** Stored passkey material — persisted as a `passkey` vault item (private key wrapped). */
export interface StoredPasskey {
  credentialId: Uint8Array;
  privateKeyPkcs8: Uint8Array;
  userHandle: Uint8Array;
  signCount: number;
}

export interface CreatePasskeyResult {
  passkey: StoredPasskey;
  /** Values the shim marshals back into a PublicKeyCredential for the page. */
  response: {
    credentialId: Uint8Array;
    clientDataJSON: Uint8Array;
    attestationObject: Uint8Array;
    publicKeyCose: Uint8Array;
  };
}

export async function createPasskey(req: CreatePasskeyRequest): Promise<CreatePasskeyResult> {
  const pair = (await subtle.generateKey(EC, true, ['sign', 'verify'])) as CryptoKeyPair;
  const rawPub = new Uint8Array(await subtle.exportKey('raw', pair.publicKey));
  const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', pair.privateKey));

  const credentialId = randomBytes(32);
  const cose = coseKeyFromRaw(rawPub);

  const attestedCredentialData = concat([
    AAGUID,
    u16(credentialId.length),
    credentialId,
    cose,
  ]);
  const authData = await authenticatorData(req.rpId, FLAG_UP | FLAG_UV | FLAG_AT, 0, attestedCredentialData);

  const attestationObject = cborEncode({
    map: [
      [T('fmt'), T('none')],
      [T('attStmt'), { map: [] }],
      [T('authData'), B(authData)],
    ],
  });

  return {
    passkey: { credentialId, privateKeyPkcs8: pkcs8, userHandle: req.userHandle, signCount: 0 },
    response: {
      credentialId,
      clientDataJSON: clientDataJSON('webauthn.create', req.challenge, req.origin),
      attestationObject,
      publicKeyCose: cose,
    },
  };
}

// ---------------------------------------------------------------------------
// get() — produce an assertion from an existing passkey
// ---------------------------------------------------------------------------

export interface GetAssertionRequest {
  rpId: string;
  origin: string;
  challenge: Uint8Array;
}

export interface GetAssertionResult {
  credentialId: Uint8Array;
  clientDataJSON: Uint8Array;
  authenticatorData: Uint8Array;
  signature: Uint8Array; // DER-encoded
  userHandle: Uint8Array;
  newSignCount: number;
}

export async function signAssertion(
  req: GetAssertionRequest,
  passkey: StoredPasskey,
): Promise<GetAssertionResult> {
  const priv = await subtle.importKey('pkcs8', bufferOf(passkey.privateKeyPkcs8), EC, false, ['sign']);
  const newSignCount = passkey.signCount + 1;

  const authData = await authenticatorData(req.rpId, FLAG_UP | FLAG_UV, newSignCount);
  const cData = clientDataJSON('webauthn.get', req.challenge, req.origin);
  const clientDataHash = await sha256(cData);
  const signed = concat([authData, clientDataHash]);

  const rawSig = new Uint8Array(await subtle.sign(ECDSA_SHA256, priv, bufferOf(signed)));

  return {
    credentialId: passkey.credentialId,
    clientDataJSON: cData,
    authenticatorData: authData,
    signature: rawSigToDer(rawSig),
    userHandle: passkey.userHandle,
    newSignCount,
  };
}

/** Return a standalone ArrayBuffer view (WebCrypto rejects Uint8Array subarray offsets on some engines). */
function bufferOf(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}
