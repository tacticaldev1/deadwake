import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { LanServer } from './server/lanServer';
import { getLanIps } from './server/hostIp';
import { startBeacon, startListening } from './server/discovery';
import { DEFAULT_COOP_PORT } from '../src/net/protocol';

// Bundled to CommonJS (see electron/build.mjs) specifically so __dirname works
// natively here — no import.meta.url/fileURLToPath dance needed.
let mainWindow: BrowserWindow | null = null;
let lanServer: LanServer | null = null;
let stopBeacon: (() => void) | null = null;
let stopListening: (() => void) | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    backgroundColor: '#0a0e14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  lanServer?.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Ask before quitting mid-session so the host doesn't accidentally strand
// connected friends without warning.
app.on('before-quit', (e) => {
  if (lanServer?.hasConnectedPlayers()) {
    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      buttons: ['Quit', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'End co-op session?',
      message: 'Other players are still connected. Quitting will end the session for everyone.',
    });
    if (choice === 1) { e.preventDefault(); return; }
  }
  lanServer?.close();
  lanServer = null;
  stopBeacon?.();
  stopBeacon = null;
  stopListening?.();
  stopListening = null;
});

ipcMain.handle('coop:getLanIps', () => getLanIps());

ipcMain.handle('coop:startHost', (_event, port: number = DEFAULT_COOP_PORT) => {
  lanServer?.close();
  stopBeacon?.();
  try {
    lanServer = new LanServer(port);
    stopBeacon = startBeacon(port);
    return { ok: true, port };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('coop:stopHost', () => {
  lanServer?.close();
  lanServer = null;
  stopBeacon?.();
  stopBeacon = null;
  return { ok: true };
});

ipcMain.handle('coop:startDiscovery', (event) => {
  stopListening?.();
  const sender = event.sender;
  stopListening = startListening(host => {
    if (!sender.isDestroyed()) sender.send('coop:hostFound', host);
  });
});

ipcMain.handle('coop:stopDiscovery', () => {
  stopListening?.();
  stopListening = null;
});
