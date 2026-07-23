import { SessionManager } from './session.js';
import type { Msg, MsgResult } from './messages.js';

const defaultSession = new SessionManager();

export async function handleMessage(msg: Msg, session: SessionManager = defaultSession): Promise<MsgResult> {
  try {
    switch (msg.kind) {
      case 'get_state':
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'set_server':
        return { ok: true, kind: 'void' };

      case 'register': {
        const recovery = await session.register(msg.serverUrl, msg.identifier, msg.password);
        return { ok: true, kind: 'state', state: await session.getState(), recovery };
      }

      case 'login':
        await session.login(msg.serverUrl, msg.identifier, msg.password);
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'unlock':
        await session.unlock(msg.password);
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'lock':
        await session.lock();
        return { ok: true, kind: 'state', state: await session.getState() };

      case 'forget':
        await session.forget();
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

      case 'change_master_password':
        await session.changeMasterPassword(msg.currentPassword, msg.newPassword);
        return { ok: true, kind: 'void' };

      case 'download_recovery': {
        const { data, filename } = await session.downloadRecoveryPhrase();
        return { ok: true, kind: 'export', data, filename };
      }

      case 'recover_account': {
        const state = await session.recoverAccount(msg.mnemonic, msg.newPassword);
        return { ok: true, kind: 'state', state };
      }

      case 'export_vault': {
        const { data, filename } = await session.exportVault(msg.format);
        return { ok: true, kind: 'export', data, filename };
      }

      case 'import_backup': {
        const res = await session.importBackup(msg.jsonText, msg.password);
        return { ok: true, kind: 'import_result', ...res };
      }

      case 'purge_vault': {
        const { backupData, backupFilename } = await session.purgeVault(msg.masterPassword, msg.downloadBackup);
        return { ok: true, kind: 'purge_result', backupData, backupFilename };
      }

      case 'sync':
        return { ok: true, kind: 'sync', pulled: await session.sync() };

      case 'autofill_query':
        return { ok: true, kind: 'autofill', matches: await session.autofillQuery(msg.url) };

      case 'autofill_identity_query':
        return { ok: true, kind: 'identity_autofill', matches: await session.identityQuery() };

      case 'autofill_card_query':
        return { ok: true, kind: 'card_autofill', matches: await session.cardQuery() };

      default:
        return { ok: false, error: `Unknown message: ${(msg as { kind: string }).kind}` };
    }
  } catch (e) {
    session.setError(e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
