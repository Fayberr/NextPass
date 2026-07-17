import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = buildApp({ dbPath: config.dbPath, logger: { level: config.logLevel } });

app
  .listen({ host: config.host, port: config.port })
  .then((addr) => {
    app.log.info(`password-manager server (Phase 0) listening on ${addr} — db: ${config.dbPath}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
