// Orchestrates the Electron dev workflow as a single command: start the Vite
// dev server, wait for it to be ready, bundle main/preload, then launch
// Electron pointed at the dev server (so it hot-reloads the renderer exactly
// like a browser tab would). Ctrl+C tears both processes down together.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const PORT = 8080;
const DEV_URL = `http://localhost:${PORT}`;

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status < 500) return resolve();
      } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('Timed out waiting for Vite dev server'));
      setTimeout(tick, 300);
    };
    tick();
  });
}

async function buildElectron() {
  const shared = { bundle: true, platform: 'node', format: 'cjs', target: 'node20', external: ['electron'] };
  await esbuild({ ...shared, entryPoints: [path.join(root, 'electron/main.ts')], outfile: path.join(root, 'dist-electron/main.cjs') });
  await esbuild({ ...shared, entryPoints: [path.join(root, 'electron/preload.ts')], outfile: path.join(root, 'dist-electron/preload.cjs') });
}

const isWin = process.platform === 'win32';
const viteBin = path.join(root, 'node_modules', '.bin', isWin ? 'vite.cmd' : 'vite');
// Windows .cmd shims need a shell to execute (spawn() alone throws EINVAL for them).
const vite = spawn(viteBin, ['--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'inherit', shell: isWin });

let electronProc = null;

const shutdown = () => {
  electronProc?.kill();
  vite.kill();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await waitForServer(DEV_URL);
  await buildElectron();
  // Spawn the real electron binary directly (not the node_modules/.bin/electron
  // shim script) — sidesteps Windows .cmd-shell-wrapping quirks entirely.
  const electronBin = isWin
    ? path.join(root, 'node_modules/electron/dist/electron.exe')
    : path.join(root, 'node_modules/electron/dist/electron');
  // ELECTRON_RUN_AS_NODE forces electron.exe to behave as plain Node (no app/
  // BrowserWindow/etc) — some environments (this one included) set it globally
  // so tooling can invoke the electron binary safely as a Node runtime. Strip
  // it here so the spawned process is a *real* Electron app with a window.
  const electronEnv = { ...process.env, VITE_DEV_SERVER_URL: DEV_URL };
  delete electronEnv.ELECTRON_RUN_AS_NODE;
  electronProc = spawn(electronBin, [root], {
    cwd: root,
    stdio: 'inherit',
    env: electronEnv,
  });
  electronProc.on('exit', (code) => { vite.kill(); process.exit(code ?? 0); });
} catch (err) {
  console.error('[electron/dev] failed:', err);
  vite.kill();
  process.exit(1);
}
