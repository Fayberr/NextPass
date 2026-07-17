/**
 * Background service worker. Single owner of the SessionManager (and thus the in-memory vault
 * key). Routes typed messages from the popup and content script. When Chrome tears down the
 * worker, the vault key is lost → the vault auto-locks, which is the desired security posture.
 */

import { SessionManager } from '../lib/session.js';
import { WebAuthnProxy } from './webauthn-proxy.js';
import type { Msg, MsgResult } from '../lib/messages.js';

const session = new SessionManager();
const waProxy = new WebAuthnProxy(session);
waProxy.install();

// Become the authoritative WebAuthn authority whenever the vault is unlocked; step aside on lock so
// the user's platform passkeys keep working.
async function syncProxyAttachment(): Promise<void> {
  const st = await session.getState();
  if (st.unlocked) await waProxy.attach();
  else await waProxy.detach();
}

async function handle(msg: Msg): Promise<MsgResult> {
  try {
    switch (msg.kind) {
      case 'get_state':
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'set_server':
        // Only meaningful before an account exists; stored implicitly on register/login.
        return { ok: true, kind: 'void' };

      case 'register': {
        const recovery = await session.register(msg.serverUrl, msg.identifier, msg.password);
        await syncProxyAttachment();
        return { ok: true, kind: 'state', state: await session.getState(), recovery };
      }

      case 'login':
        await session.login(msg.serverUrl, msg.identifier, msg.password);
        await syncProxyAttachment();
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'unlock':
        await session.unlock(msg.password);
        await syncProxyAttachment();
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'lock':
        await session.lock();
        await syncProxyAttachment();
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'forget':
        await session.forget();
        await syncProxyAttachment();
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'ack_recovery':
        await session.ackRecovery();
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'list_items':
        return { ok: true, kind: 'items', items: await session.listItems() };

      case 'get_item': {
        const { type, fields } = await session.getItem(msg.id);
        return { ok: true, kind: 'item', id: msg.id, type, fields };
      }

      case 'create_login':
        await session.createLogin(msg.fields);
        return { ok: true, kind: 'void' };

      case 'sync':
        return { ok: true, kind: 'sync', pulled: await session.sync() };

      case 'autofill_query':
        return { ok: true, kind: 'autofill', matches: await session.autofillQuery(msg.url) };

      case 'passkey_create':
        return { ok: true, kind: 'passkey_created', res: await session.passkeyCreate(msg.req) };

      case 'passkey_get':
        return { ok: true, kind: 'passkey_asserted', res: await session.passkeyGet(msg.req) };

      default:
        return { ok: false, error: `Unknown message: ${(msg as { kind: string }).kind}` };
    }
  } catch (e) {
    session.setError(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  handle(msg).then(sendResponse);
  return true; // keep the channel open for the async response
});
