/**
 * Main-world WebAuthn shim. Runs in the PAGE's JS context (world: MAIN) at document_start so it
 * can replace navigator.credentials.create/get BEFORE any relying-party script calls them.
 *
 * It owns no secrets and no chrome.* access. It marshals the RP's PublicKeyCredential options
 * into a plain, JSON-safe request (base64url for all binary), hands it to the isolated-world
 * bridge via window.postMessage, and reconstructs a PublicKeyCredential from the reply.
 *
 * Fallback: if the vault has no passkey / is locked / the user denies, we fall back to the real
 * platform authenticator so the site keeps working.
 */

const TAG = '__pm_webauthn__';
let seq = 0;

// --- base64url <-> bytes (page context; no shared import to keep main-world tiny) ---
function bufToB64url(buf: ArrayBuffer | ArrayBufferView): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBuf(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function rpIdFromOrigin(): string {
  return location.hostname;
}

/** Round-trip a request through the isolated-world bridge. */
function ask<T>(op: 'create' | 'get', req: unknown): Promise<{ ok: true; res: T } | { ok: false; error: string; fallback?: boolean }> {
  return new Promise((resolve) => {
    const id = `${Date.now()}-${seq++}`;
    function onMsg(ev: MessageEvent) {
      const d = ev.data;
      if (!d || d[TAG] !== 'response' || d.id !== id) return;
      window.removeEventListener('message', onMsg);
      resolve(d.payload);
    }
    window.addEventListener('message', onMsg);
    window.postMessage({ [TAG]: 'request', id, op, req }, location.origin);
  });
}

const orig = {
  create: navigator.credentials.create.bind(navigator.credentials),
  get: navigator.credentials.get.bind(navigator.credentials),
};

navigator.credentials.create = async function (options?: CredentialCreationOptions): Promise<Credential | null> {
  const pk = options?.publicKey;
  if (!pk) return orig.create(options);

  const rp = pk.rp ?? {};
  const user = pk.user;
  const req = {
    rpId: rp.id ?? rpIdFromOrigin(),
    rpName: rp.name,
    origin: location.origin,
    challenge: bufToB64url(pk.challenge as ArrayBuffer),
    userHandle: bufToB64url(user.id as ArrayBuffer),
    userName: user.name,
    userDisplayName: user.displayName,
    excludeCredentials: (pk.excludeCredentials ?? []).map((c) => bufToB64url(c.id as ArrayBuffer)),
  };

  const r = await ask<{ credentialId: string; clientDataJSON: string; attestationObject: string; transports: string[] }>('create', req);
  if (!r.ok) {
    if (r.fallback) return orig.create(options);
    throw new DOMException(r.error || 'Passkey creation failed', 'NotAllowedError');
  }

  const rawId = b64urlToBuf(r.res.credentialId);
  const cred = {
    id: r.res.credentialId,
    rawId,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    response: {
      clientDataJSON: b64urlToBuf(r.res.clientDataJSON),
      attestationObject: b64urlToBuf(r.res.attestationObject),
      getTransports: () => r.res.transports,
    },
    getClientExtensionResults: () => ({}),
  };
  Object.setPrototypeOf(cred, PublicKeyCredential.prototype);
  return cred as unknown as Credential;
};

navigator.credentials.get = async function (options?: CredentialRequestOptions): Promise<Credential | null> {
  const pk = options?.publicKey;
  if (!pk) return orig.get(options);

  const req = {
    rpId: pk.rpId ?? rpIdFromOrigin(),
    origin: location.origin,
    challenge: bufToB64url(pk.challenge as ArrayBuffer),
    allowCredentials: (pk.allowCredentials ?? []).map((c) => bufToB64url(c.id as ArrayBuffer)),
  };

  const r = await ask<{ credentialId: string; clientDataJSON: string; authenticatorData: string; signature: string; userHandle: string }>('get', req);
  if (!r.ok) {
    if (r.fallback) return orig.get(options);
    throw new DOMException(r.error || 'Passkey request failed', 'NotAllowedError');
  }

  const rawId = b64urlToBuf(r.res.credentialId);
  const cred = {
    id: r.res.credentialId,
    rawId,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    response: {
      clientDataJSON: b64urlToBuf(r.res.clientDataJSON),
      authenticatorData: b64urlToBuf(r.res.authenticatorData),
      signature: b64urlToBuf(r.res.signature),
      userHandle: r.res.userHandle ? b64urlToBuf(r.res.userHandle) : null,
    },
    getClientExtensionResults: () => ({}),
  };
  Object.setPrototypeOf(cred, PublicKeyCredential.prototype);
  return cred as unknown as Credential;
};
