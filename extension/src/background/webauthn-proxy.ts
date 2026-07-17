/**
 * chrome.webAuthenticationProxy integration — makes this extension the AUTHORITATIVE WebAuthn
 * provider at the browser level, so passkey ceremonies route to our vault instead of the platform
 * authenticator or a competing extension (e.g. Kaspersky).
 *
 * The proxy events give us the request options as JSON but NOT the origin or tab id. We recover the
 * true origin (and get user approval) by messaging the requesting tab's content script, which lives
 * in the page and knows location.origin. That content script also pins navigator.credentials to the
 * native path so nothing else can intercept ahead of us.
 *
 * We attach only while the vault is unlocked; on lock we detach so the user's other (platform)
 * passkeys keep working normally.
 */

import type { SessionManager } from '../lib/session.js';
import type {
  PasskeyCreateReq,
  PasskeyGetReq,
  WaPromptPasskey,
  WaPromptRequest,
  WaPromptResponse,
} from '../lib/messages.js';

// Shapes of the JSON handed to us by the proxy (WebAuthn "JSON" form: binary fields are base64url).
interface CreationOptionsJson {
  rp?: { id?: string; name?: string };
  user: { id: string; name?: string; displayName?: string };
  challenge: string;
  excludeCredentials?: { id: string }[];
}
interface RequestOptionsJson {
  rpId?: string;
  challenge: string;
  allowCredentials?: { id: string }[];
}

const wap = () => chrome.webAuthenticationProxy;

/** Ask the active tab for its origin + user approval. Returns null if no reachable content script. */
async function promptActiveTab(
  op: 'create' | 'get',
  rpId: string,
  opts?: { userName?: string; passkeys?: WaPromptPasskey[] },
): Promise<WaPromptResponse | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return null;
  const msg: WaPromptRequest = { kind: 'wa_prompt', op, rpId, userName: opts?.userName, passkeys: opts?.passkeys };
  try {
    return (await chrome.tabs.sendMessage(tab.id, msg)) as WaPromptResponse;
  } catch {
    return null; // e.g. chrome:// page, or content script not injected
  }
}

export class WebAuthnProxy {
  private attached = false;
  private unlockWindowId: number | null = null;
  constructor(private session: SessionManager) {}

  /**
   * If the vault is locked when a ceremony arrives, open our popup as a standalone window so the
   * user can unlock, then wait (polling) until unlocked or a timeout. Returns false if still locked.
   * This is what lets us intercept even while locked instead of falling through to Windows Hello.
   */
  private async ensureUnlocked(): Promise<boolean> {
    if ((await this.session.getState()).unlocked) return true;
    await this.openUnlockWindow();
    const deadline = Date.now() + 55_000; // stay under the RP's typical ~60s ceremony timeout
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 600));
      if ((await this.session.getState()).unlocked) {
        await this.closeUnlockWindow();
        return true;
      }
    }
    await this.closeUnlockWindow();
    return false;
  }

  private async openUnlockWindow(): Promise<void> {
    if (this.unlockWindowId !== null) {
      try {
        await chrome.windows.update(this.unlockWindowId, { focused: true });
        return;
      } catch {
        this.unlockWindowId = null; // window was closed; fall through and reopen
      }
    }
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL('index.html'),
      type: 'popup',
      width: 380,
      height: 600,
      focused: true,
    });
    this.unlockWindowId = win?.id ?? null;
  }

  private async closeUnlockWindow(): Promise<void> {
    if (this.unlockWindowId === null) return;
    const id = this.unlockWindowId;
    this.unlockWindowId = null;
    await chrome.windows.remove(id).catch(() => undefined);
  }

  install(): void {
    if (typeof chrome.webAuthenticationProxy === 'undefined') {
      console.warn('[pm] chrome.webAuthenticationProxy unavailable (needs Chrome/Opera 115+).');
      return;
    }
    wap().onCreateRequest.addListener((r) => void this.onCreate(r));
    wap().onGetRequest.addListener((r) => void this.onGet(r));
    wap().onIsUvpaaRequest.addListener((r) => void wap().completeIsUvpaaRequest({ requestId: r.requestId, isUvpaa: true }));
  }

  async attach(): Promise<void> {
    if (this.attached || typeof chrome.webAuthenticationProxy === 'undefined') return;
    const err = await wap().attach();
    if (err) {
      // Another extension (or our own prior worker) holds the proxy.
      console.warn('[pm] webAuthenticationProxy attach failed:', err);
      return;
    }
    this.attached = true;
  }

  async detach(): Promise<void> {
    // Always attempt: after a service-worker restart the browser may still hold our attachment even
    // though `attached` reset to false, so guarding on the flag would leave us attached-while-locked.
    if (typeof chrome.webAuthenticationProxy === 'undefined') return;
    await wap().detach().catch(() => undefined);
    this.attached = false;
  }

  private async onCreate(r: chrome.webAuthenticationProxy.CreateRequest): Promise<void> {
    try {
      if (!(await this.ensureUnlocked())) throw domError('NotAllowedError', 'Vault is locked.');
      const opts = JSON.parse(r.requestDetailsJson) as CreationOptionsJson;
      const prompt = await promptActiveTab('create', opts.rp?.id ?? '', { userName: opts.user?.name });
      const origin = prompt?.origin ?? (opts.rp?.id ? `https://${opts.rp.id}` : '');
      if (prompt && !prompt.approved) throw domError('NotAllowedError', 'User declined the passkey.');
      if (!origin) throw domError('NotAllowedError', 'Could not determine request origin.');

      const rpId = opts.rp?.id ?? new URL(origin).hostname;
      const req: PasskeyCreateReq = {
        rpId,
        rpName: opts.rp?.name,
        origin,
        challenge: opts.challenge,
        userHandle: opts.user.id,
        userName: opts.user.name,
        userDisplayName: opts.user.displayName,
        excludeCredentials: (opts.excludeCredentials ?? []).map((c) => c.id),
      };
      const res = await this.session.passkeyCreate(req);
      const responseJson = JSON.stringify({
        id: res.credentialId,
        rawId: res.credentialId,
        type: 'public-key',
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: res.clientDataJSON,
          attestationObject: res.attestationObject,
          authenticatorData: res.authenticatorData,
          transports: res.transports,
          publicKey: res.publicKey,
          publicKeyAlgorithm: res.publicKeyAlgorithm,
        },
        clientExtensionResults: {},
      });
      await wap().completeCreateRequest({ requestId: r.requestId, responseJson });
    } catch (e) {
      await wap().completeCreateRequest({ requestId: r.requestId, error: toDomException(e) });
    }
  }

  private async onGet(r: chrome.webAuthenticationProxy.GetRequest): Promise<void> {
    try {
      if (!(await this.ensureUnlocked())) throw domError('NotAllowedError', 'Vault is locked.');
      const opts = JSON.parse(r.requestDetailsJson) as RequestOptionsJson;
      const allowIds = (opts.allowCredentials ?? []).map((c) => c.id);
      // Show the user which saved passkeys match this site so they can pick one.
      const passkeys = await this.session.passkeyList(opts.rpId ?? '', allowIds);
      const prompt = await promptActiveTab('get', opts.rpId ?? '', { passkeys });
      const origin = prompt?.origin ?? (opts.rpId ? `https://${opts.rpId}` : '');
      if (prompt && !prompt.approved) throw domError('NotAllowedError', 'User declined the passkey.');
      if (!origin) throw domError('NotAllowedError', 'Could not determine request origin.');

      const rpId = opts.rpId ?? new URL(origin).hostname;
      // If the user picked a specific passkey in the card, restrict the assertion to it.
      const chosen = prompt?.credentialId ? [prompt.credentialId] : allowIds;
      const req: PasskeyGetReq = {
        rpId,
        origin,
        challenge: opts.challenge,
        allowCredentials: chosen,
      };
      const res = await this.session.passkeyGet(req);
      const responseJson = JSON.stringify({
        id: res.credentialId,
        rawId: res.credentialId,
        type: 'public-key',
        authenticatorAttachment: 'platform',
        response: {
          clientDataJSON: res.clientDataJSON,
          authenticatorData: res.authenticatorData,
          signature: res.signature,
          userHandle: res.userHandle,
        },
        clientExtensionResults: {},
      });
      await wap().completeGetRequest({ requestId: r.requestId, responseJson });
    } catch (e) {
      await wap().completeGetRequest({ requestId: r.requestId, error: toDomException(e) });
    }
  }
}

function domError(name: string, message: string): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}
function toDomException(e: unknown): chrome.webAuthenticationProxy.DOMExceptionDetails {
  const err = e instanceof Error ? e : new Error(String(e));
  // Map "no passkey / locked" to NotAllowedError so the RP shows a normal "couldn't sign in".
  const name = err.name && err.name !== 'Error' ? err.name : 'NotAllowedError';
  return { name, message: err.message };
}
