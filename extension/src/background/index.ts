/**
 * Background service worker. Single owner of the SessionManager (and thus the in-memory vault
 * key). Routes typed messages from the popup and content script. When Chrome tears down the
 * worker, the vault key is lost → the vault auto-locks, which is the desired security posture.
 */

import { SessionManager } from '../lib/session.js';
import { WebAuthnProxy } from './webauthn-proxy.js';
import type { Msg, MsgResult } from '../lib/messages.js';
import { getSettings, setSettings } from '../lib/settings.js';

const session = new SessionManager();
const waProxy = new WebAuthnProxy(session);
waProxy.install();

// --- auto-lock ---------------------------------------------------------------------------------
// A chrome.alarms timer locks the vault after N minutes of inactivity. Every UI message counts as
// activity and re-arms the alarm. autoLockMinutes = 0 disables it. The alarm survives worker
// teardown (unlike a setTimeout), so the lock still fires even if the worker slept in between.
const AUTO_LOCK_ALARM = 'pm-auto-lock';

async function scheduleAutoLock(): Promise<void> {
  const { autoLockMinutes } = await getSettings();
  await chrome.alarms.clear(AUTO_LOCK_ALARM);
  if (autoLockMinutes > 0) {
    chrome.alarms.create(AUTO_LOCK_ALARM, { delayInMinutes: autoLockMinutes });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== AUTO_LOCK_ALARM) return;
  void (async () => {
    await session.lock();
    await syncProxyAttachment();
  })();
});

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
        const { type, fields, favorite } = await session.getItem(msg.id);
        return { ok: true, kind: 'item', id: msg.id, type, fields, favorite };
      }

      case 'create_login':
        await session.createLogin(msg.fields);
        return { ok: true, kind: 'void' };

      case 'update_login':
        await session.updateLogin(msg.id, msg.fields);
        return { ok: true, kind: 'void' };

      case 'create_totp':
        await session.createTotp(msg.fields);
        return { ok: true, kind: 'void' };

      case 'update_totp':
        await session.updateTotp(msg.id, msg.fields);
        return { ok: true, kind: 'void' };

      case 'create_secret':
        await session.createSecret(msg.fields);
        return { ok: true, kind: 'void' };

      case 'update_secret':
        await session.updateSecret(msg.id, msg.fields);
        return { ok: true, kind: 'void' };

      case 'create_identity':
        await session.createIdentity(msg.fields);
        return { ok: true, kind: 'void' };

      case 'update_identity':
        await session.updateIdentity(msg.id, msg.fields);
        return { ok: true, kind: 'void' };

      case 'create_card':
        await session.createCard(msg.fields);
        return { ok: true, kind: 'void' };

      case 'update_card':
        await session.updateCard(msg.id, msg.fields);
        return { ok: true, kind: 'void' };

      case 'create_note':
        await session.createNote(msg.fields);
        return { ok: true, kind: 'void' };

      case 'update_note':
        await session.updateNote(msg.id, msg.fields);
        return { ok: true, kind: 'void' };

      case 'delete_item':
        await session.deleteItem(msg.id);
        return { ok: true, kind: 'void' };

      case 'set_favorite':
        await session.setFavorite(msg.id, msg.favorite);
        return { ok: true, kind: 'void' };

      case 'audit':
        return { ok: true, kind: 'audit', report: await session.audit() };

      case 'get_settings':
        return { ok: true, kind: 'settings', settings: await getSettings() };

      case 'set_settings': {
        const settings = await setSettings(msg.patch);
        await scheduleAutoLock();
        return { ok: true, kind: 'settings', settings };
      }

      case 'sync':
        return { ok: true, kind: 'sync', pulled: await session.sync() };

      case 'autofill_query':
        return { ok: true, kind: 'autofill', matches: await session.autofillQuery(msg.url) };

      case 'passkey_create':
        return { ok: true, kind: 'passkey_created', res: await session.passkeyCreate(msg.req) };

      case 'passkey_get':
        return { ok: true, kind: 'passkey_asserted', res: await session.passkeyGet(msg.req) };

      case 'open_unlock_ui':
        await waProxy.openUnlockUi();
        return { ok: true, kind: 'void' };

      default:
        return { ok: false, error: `Unknown message: ${(msg as { kind: string }).kind}` };
    }
  } catch (e) {
    session.setError(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  handle(msg).then((res) => {
    // Any successful interaction with an unlocked vault counts as activity: re-arm the auto-lock.
    void (async () => {
      if ((await session.getState()).unlocked) await scheduleAutoLock();
    })();
    sendResponse(res);
  });
  return true; // keep the channel open for the async response
});
