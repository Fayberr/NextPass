import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import type { DB } from '../db.js';
import { issueDeviceToken, newId, sha256 } from '../auth.js';
import type { AuthResponse, PreloginResponse } from '@pm/shared';

const kdfParamsSchema = z.object({
  alg: z.literal('argon2id'),
  m: z.number().int().positive(),
  t: z.number().int().positive(),
  p: z.number().int().positive(),
  v: z.number().int().positive(),
});

const registerSchema = z.object({
  identifier: z.string().min(1).max(320),
  isAdmin: z.boolean(),
  masterPwSalt: z.string().min(1),
  kdfParams: kdfParamsSchema,
  authKeyHash: z.string().min(1),
  wrappedKeyByMasterPw: z.string().min(1),
  wrappedKeyByAdmin: z.string().nullable(),
  wrappedKeyByRecovery: z.string().min(1),
  device: z.object({ platform: z.string().min(1).max(64) }),
});

const preloginSchema = z.object({ identifier: z.string().min(1).max(320) });

const loginSchema = z.object({
  identifier: z.string().min(1).max(320),
  authKeyHash: z.string().min(1),
  device: z.object({ platform: z.string().min(1).max(64) }),
});

const b64 = (s: string) => Buffer.from(s, 'base64');

export async function authRoutes(app: FastifyInstance, { db }: { db: DB }): Promise<void> {
  const findUser = db.prepare('SELECT * FROM users WHERE identifier = ?');

  const insertUser = db.prepare(
    `INSERT INTO users (id, identifier, is_admin, master_pw_salt, kdf_params, auth_key_hash, created_at, updated_at)
     VALUES (@id, @identifier, @is_admin, @master_pw_salt, @kdf_params, @auth_key_hash, @now, @now)`,
  );
  const insertVault = db.prepare(
    `INSERT INTO vaults (id, user_id, wrapped_key_by_master_pw, wrapped_key_by_admin, wrapped_key_by_recovery, created_at, updated_at)
     VALUES (@id, @user_id, @m, @admin, @recovery, @now, @now)`,
  );
  const insertDevice = db.prepare(
    `INSERT INTO devices (id, user_id, platform, token_hash, last_sync_cursor, created_at, last_seen_at)
     VALUES (@id, @user_id, @platform, @token_hash, 0, @now, @now)`,
  );
  const getVault = db.prepare('SELECT * FROM vaults WHERE user_id = ?');

  function makeDevice(userId: string, platform: string, now: number) {
    const { token, tokenHash } = issueDeviceToken();
    const deviceId = newId();
    insertDevice.run({ id: deviceId, user_id: userId, platform, token_hash: tokenHash, now });
    return { deviceId, token };
  }

  // --- POST /api/register --------------------------------------------------
  app.post('/api/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const body = parsed.data;
    const identifier = body.identifier.trim().toLowerCase();

    if (findUser.get(identifier)) return reply.code(409).send({ error: 'identifier already registered' });

    const now = Date.now();
    const userId = newId();
    const vaultId = newId();

    const tx = db.transaction(() => {
      insertUser.run({
        id: userId,
        identifier,
        is_admin: body.isAdmin ? 1 : 0,
        master_pw_salt: b64(body.masterPwSalt),
        kdf_params: JSON.stringify(body.kdfParams),
        auth_key_hash: b64(body.authKeyHash),
        now,
      });
      insertVault.run({
        id: vaultId,
        user_id: userId,
        m: b64(body.wrappedKeyByMasterPw),
        admin: body.wrappedKeyByAdmin ? b64(body.wrappedKeyByAdmin) : null,
        recovery: b64(body.wrappedKeyByRecovery),
        now,
      });
      return makeDevice(userId, body.device.platform, now);
    });

    const { deviceId, token } = tx();
    const res: AuthResponse = {
      userId,
      deviceId,
      deviceToken: token,
      vault: {
        vaultId,
        wrappedKeyByMasterPw: body.wrappedKeyByMasterPw,
        wrappedKeyByRecovery: body.wrappedKeyByRecovery,
      },
    };
    return reply.code(201).send(res);
  });

  // --- POST /api/prelogin --------------------------------------------------
  app.post('/api/prelogin', async (request, reply) => {
    const parsed = preloginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const user = findUser.get(parsed.data.identifier.trim().toLowerCase()) as
      | { master_pw_salt: Buffer; kdf_params: string }
      | undefined;

    // Always return a well-formed response (avoid leaking which identifiers exist).
    // Unknown users get a deterministic decoy salt derived from the identifier.
    const res: PreloginResponse = user
      ? {
          masterPwSalt: user.master_pw_salt.toString('base64'),
          kdfParams: JSON.parse(user.kdf_params),
        }
      : {
          masterPwSalt: sha256('decoy:' + parsed.data.identifier).subarray(0, 16).toString('base64'),
          kdfParams: { alg: 'argon2id', m: 65536, t: 3, p: 1, v: 1 },
        };
    return reply.send(res);
  });

  // --- POST /api/login -----------------------------------------------------
  app.post('/api/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const body = parsed.data;
    const user = findUser.get(body.identifier.trim().toLowerCase()) as
      | { id: string; auth_key_hash: Buffer }
      | undefined;

    const provided = b64(body.authKeyHash);
    const ok =
      !!user &&
      provided.length === user.auth_key_hash.length &&
      timingSafeEqual(provided, user.auth_key_hash);
    if (!ok) return reply.code(401).send({ error: 'invalid credentials' });

    const vault = getVault.get(user!.id) as {
      id: string;
      wrapped_key_by_master_pw: Buffer;
      wrapped_key_by_recovery: Buffer;
    };
    const now = Date.now();
    const { deviceId, token } = makeDevice(user!.id, body.device.platform, now);

    const res: AuthResponse = {
      userId: user!.id,
      deviceId,
      deviceToken: token,
      vault: {
        vaultId: vault.id,
        wrappedKeyByMasterPw: vault.wrapped_key_by_master_pw.toString('base64'),
        wrappedKeyByRecovery: vault.wrapped_key_by_recovery.toString('base64'),
      },
    };
    return reply.send(res);
  });
}
