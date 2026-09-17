import { contextBridge, ipcRenderer } from 'electron';

interface FoundHost {
  ip: string;
  port: number;
  name: string;
  code: string;
}

// Exposed to the renderer as `window.coop`. Only the host side needs Node/IPC
// access (binding a TCP listener, reading network interfaces) — joining a
// session is done entirely with the renderer's native WebSocket, no bridge
// needed for that half at all. Discovery is the one exception: listening for
// UDP broadcasts needs Node too, even though it's only used from the Join tab.
contextBridge.exposeInMainWorld('coop', {
  isElectron: true,
  getLanIps: (): Promise<string[]> => ipcRenderer.invoke('coop:getLanIps'),
  startHost: (port: number): Promise<{ ok: boolean; port?: number; code?: string; error?: string }> =>
    ipcRenderer.invoke('coop:startHost', port),
  stopHost: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('coop:stopHost'),
  startDiscovery: (onFound: (host: FoundHost) => void): void => {
    ipcRenderer.removeAllListeners('coop:hostFound');
    ipcRenderer.on('coop:hostFound', (_event, host: FoundHost) => onFound(host));
    ipcRenderer.invoke('coop:startDiscovery');
  },
  stopDiscovery: (): void => {
    ipcRenderer.removeAllListeners('coop:hostFound');
    ipcRenderer.invoke('coop:stopDiscovery');
  },
});
