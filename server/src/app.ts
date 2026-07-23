import Fastify, { type FastifyInstance } from 'fastify';
import type { DB } from './db.js';
import { openDb } from './db.js';
import { requireAuth } from './auth.js';
import { authRoutes } from './routes/auth.js';
import { vaultRoutes } from './routes/vault.js';
import { itemRoutes } from './routes/items.js';
import { syncRoutes } from './routes/sync.js';
import { deviceRoutes } from './routes/devices.js';

export interface AppOptions {
  db?: DB;
  dbPath?: string;
  logger?: boolean | object;
}

/** Build a fully-wired Fastify instance. Accepts an injected DB (tests) or a path. */
export function buildApp(opts: AppOptions = {}): FastifyInstance {
  const db = opts.db ?? openDb(opts.dbPath ?? ':memory:');
  const app = Fastify({ logger: opts.logger ?? false });

  const auth = requireAuth(db);

  // Allow CORS from all origins (including localhost dev servers and extension origins)
  app.addHook('onRequest', async (req, reply) => {
    const origin = req.headers.origin;
    reply.header('Access-Control-Allow-Origin', origin || '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Token, x-device-token');
    reply.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });

  app.get('/api/health', async () => ({ status: 'ok', service: 'password-manager', phase: 0 }));

  // Public (identity establishment)
  app.register(authRoutes, { db });

  // Authenticated (everything below requires a valid device token)
  app.register(async (secured) => {
    secured.addHook('preHandler', auth);
    await vaultRoutes(secured, { db });
    await itemRoutes(secured, { db });
    await syncRoutes(secured, { db });
    await deviceRoutes(secured, { db });
  });

  app.decorate('db', db);
  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: DB;
  }
}
