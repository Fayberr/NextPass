import type { FastifyInstance } from 'fastify';
import type { DB } from '../db.js';
import type { DeviceInfo } from '@pm/shared';

/** Device/session management: list paired devices, remote-revoke a specific one (e.g. lost phone). */
export async function deviceRoutes(app: FastifyInstance, { db }: { db: DB }): Promise<void> {
  const listDevices = db.prepare(
    'SELECT id, platform, created_at, last_seen_at FROM devices WHERE user_id = ? ORDER BY created_at ASC',
  );
  const deleteDevice = db.prepare('DELETE FROM devices WHERE id = ? AND user_id = ?');

  // --- GET /api/devices ----------------------------------------------------
  app.get('/api/devices', async (request, reply) => {
    const rows = listDevices.all(request.auth!.userId) as Array<{
      id: string;
      platform: string;
      created_at: number;
      last_seen_at: number;
    }>;
    const devices: DeviceInfo[] = rows.map((r) => ({
      id: r.id,
      platform: r.platform,
      createdAt: r.created_at,
      lastSeenAt: r.last_seen_at,
      current: r.id === request.auth!.deviceId,
    }));
    return reply.send({ devices });
  });

  // --- DELETE /api/devices/:id (remote revoke) -----------------------------
  app.delete('/api/devices/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const info = deleteDevice.run(id, request.auth!.userId);
    if (info.changes === 0) return reply.code(404).send({ error: 'not found' });
    return reply.code(204).send();
  });
}
