import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { DB } from './db.js';

export function newId(): string {
  return randomUUID();
}

/** Issue a raw bearer token (returned to the client once) + its SHA-256 hash (stored). */
export function issueDeviceToken(): { token: string; tokenHash: Buffer } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: sha256(token) };
}

export function sha256(input: string | Buffer): Buffer {
  return createHash('sha256').update(input).digest();
}

export interface AuthContext {
  userId: string;
  deviceId: string;
  vaultId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

/**
 * preHandler that validates the `Authorization: Bearer <token>` header against a device row,
 * populates `request.auth`, and touches `last_seen_at`. Rejects with 401 otherwise.
 */
export function requireAuth(db: DB) {
  const lookup = db.prepare(
    `SELECT d.id AS deviceId, d.user_id AS userId, d.token_hash AS tokenHash, v.id AS vaultId
       FROM devices d JOIN vaults v ON v.user_id = d.user_id
      WHERE d.token_hash = ?`,
  );
  const touch = db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?');

  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      await reply.code(401).send({ error: 'missing bearer token' });
      return;
    }
    const tokenHash = sha256(header.slice('Bearer '.length).trim());
    const row = lookup.get(tokenHash) as
      | { deviceId: string; userId: string; tokenHash: Buffer; vaultId: string }
      | undefined;

    // Constant-time confirm (lookup already matched on hash, but keep the comparison uniform).
    if (!row || !timingSafeEqual(row.tokenHash, tokenHash)) {
      await reply.code(401).send({ error: 'invalid token' });
      return;
    }
    request.auth = { userId: row.userId, deviceId: row.deviceId, vaultId: row.vaultId };
    touch.run(Date.now(), row.deviceId);
  };
}
