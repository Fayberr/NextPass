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

// Become THE authoritative WebAuthn authority whenever the extension is installed — even before the
// vault is set up and even while it is locked — so passkey ceremonies never fall through to Windows
// Hello. A not-ready request pops our window to register/log in/unlock first (WebAuthnProxy
// .ensureReady). We deliberately do NOT detach on lock/forget: staying attached is what guarantees
// interception on the very next ceremony.
async function syncProxyAttachment(): Promise<void> {
  await waProxy.attach();
}

// CRITICAL: attach on every worker boot, not just after a user action. The browser only routes a
// passkey ceremony to us if we are ALREADY attached when it fires; after an extension reload or a
// browser restart the worker starts cold with no attachment, so without this the very first
// ceremony would fall through to Windows Hello. onStartup covers browser launch; onInstalled covers
// install/reload; the bare call covers any other cold start (event-driven wake).
void syncProxyAttachment();
chrome.runtime.onStartup.addListener(() => void syncProxyAttachment());
chrome.runtime.onInstalled.addListener(() => void syncProxyAttachment());

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

      case 'update_login':
        await session.updateLogin(msg.id, msg.fields);
        return { ok: true, kind: 'void' };

      case 'delete_item':
        await session.deleteItem(msg.id);
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
