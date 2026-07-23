import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { DB } from '../db.js';
import type { VaultKeysResponse } from '@pm/shared';

const kdfParamsSchema = z.object({
  alg: z.literal('argon2id'),
  m: z.number().int().positive(),
  t: z.number().int().positive(),
  p: z.number().int().positive(),
  v: z.number().int().positive(),
});

const changePasswordSchema = z.object({
  masterPwSalt: z.string().min(1),
  kdfParams: kdfParamsSchema,
  authKeyHash: z.string().min(1),
  wrappedKeyByMasterPw: z.string().min(1),
});

const b64 = (s: string) => Buffer.from(s, 'base64');

/** GET /api/vault — the caller's wrapped vault-key blobs (for unlock on an already-paired device). */
export async function vaultRoutes(app: FastifyInstance, { db }: { db: DB }): Promise<void> {
  const getVault = db.prepare('SELECT * FROM vaults WHERE id = ?');

  const updateUser = db.prepare(
    `UPDATE users SET master_pw_salt = @master_pw_salt, kdf_params = @kdf_params, auth_key_hash = @auth_key_hash, updated_at = @now WHERE id = @id`
  );
  const updateVault = db.prepare(
    `UPDATE vaults SET wrapped_key_by_master_pw = @m, updated_at = @now WHERE user_id = @user_id`
  );
  const updateRecovery = db.prepare(
    `UPDATE vaults SET wrapped_key_by_recovery = @r, updated_at = @now WHERE user_id = @user_id`
  );

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

  // --- POST /api/user/change-password -------------------------------------
  app.post('/api/user/change-password', async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const body = parsed.data;
    const now = Date.now();

    const tx = db.transaction(() => {
      updateUser.run({
        id: request.auth!.userId,
        master_pw_salt: b64(body.masterPwSalt),
        kdf_params: JSON.stringify(body.kdfParams),
        auth_key_hash: b64(body.authKeyHash),
        now,
      });
      updateVault.run({
        user_id: request.auth!.userId,
        m: b64(body.wrappedKeyByMasterPw),
        now,
      });
    });

    tx();
    return reply.send({ ok: true });
  });

  // --- POST /api/user/update-recovery -------------------------------------
  app.post('/api/user/update-recovery', async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: 'unauthorized' });
    const { wrappedKeyByRecovery } = request.body as { wrappedKeyByRecovery: string };
    if (!wrappedKeyByRecovery) return reply.code(400).send({ error: 'missing wrappedKeyByRecovery' });
    const now = Date.now();
    updateRecovery.run({
      user_id: request.auth.userId,
      r: b64(wrappedKeyByRecovery),
      now,
    });
    return reply.send({ ok: true });
  });
}
