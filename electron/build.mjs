// Bundles the Electron main process and preload script into self-contained
// CommonJS files. Deliberately not using vite-plugin-electron here — its
// Rollup output options aren't compatible with this project's Vite 5 /
// classic-Rollup toolchain (it targets Rolldown-based Vite). Plain esbuild
// gives full, predictable control over the output format instead, which
// matters a lot here: Electron's main process needs `require('electron')`
// CommonJS semantics, and this repo's package.json has "type": "module", so
// the output extension must be `.cjs` (authoritative over the package.json
// default) with content actually emitted as CommonJS to match.
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outdir = path.join(__dirname, '../dist-electron');

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  external: ['electron'],
  logLevel: 'info',
};

await build({
  ...shared,
  entryPoints: [path.join(__dirname, 'main.ts')],
  outfile: path.join(outdir, 'main.cjs'),
});

await build({
  ...shared,
  entryPoints: [path.join(__dirname, 'preload.ts')],
  outfile: path.join(outdir, 'preload.cjs'),
});

console.log('[electron/build] main.cjs + preload.cjs written to dist-electron/');
