import type { FastifyInstance } from 'fastify';
import type { DB } from '../db.js';
import type { VaultKeysResponse } from '@pm/shared';

/** GET /api/vault — the caller's wrapped vault-key blobs (for unlock on an already-paired device). */
export async function vaultRoutes(app: FastifyInstance, { db }: { db: DB }): Promise<void> {
  const getVault = db.prepare('SELECT * FROM vaults WHERE id = ?');

  app.get('/api/vault', async (request, reply) => {
    const row = getVault.get(request.auth!.vaultId) as {
      id: string;
      wrapped_key_by_master_pw: Buffer;
      wrapped_key_by_recovery: Buffer;
    };
    const res: VaultKeysResponse = {
      vaultId: row.id,
      wrappedKeyByMasterPw: row.wrapped_key_by_master_pw.toString('base64'),
      wrappedKeyByRecovery: row.wrapped_key_by_recovery.toString('base64'),
    };
    return reply.send(res);
  });
}
