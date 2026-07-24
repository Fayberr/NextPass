import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';
import fs from 'node:fs';
import { builtinModules, createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Keep Electron + Node built-ins external (they exist at runtime); everything else - notably
// sql.js, used by the Chrome-import handler - must be BUNDLED into main.js, because the WinPC
// deployment ships only dist/ + dist-electron/ with no node_modules besides electron itself.
const mainExternals = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

/** sql.js loads its WebAssembly from a sibling file at runtime (locateFile -> __dirname), so the
 *  bundled main.js has no way to reach node_modules; copy the wasm next to it in dist-electron. */
function copySqlWasm(): Plugin {
  return {
    name: 'copy-sql-wasm',
    closeBundle() {
      const src = require.resolve('sql.js/dist/sql-wasm.wasm');
      const destDir = path.resolve(__dirname, 'dist-electron');
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, 'sql-wasm.wasm'));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          plugins: [copySqlWasm()],
          build: {
            rollupOptions: {
              external: mainExternals,
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs',
              },
            },
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
