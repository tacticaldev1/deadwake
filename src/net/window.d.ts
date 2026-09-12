export {};

// Exposed by electron/preload.ts via contextBridge. Only present when running
// inside the packaged Electron app — a plain browser tab (npm run dev) never
// has window.coop, which is exactly how we detect "can this instance host?".
export interface FoundCoopHost {
  ip: string;
  port: number;
  name: string;
}

declare global {
  interface Window {
    coop?: {
      isElectron: true;
      getLanIps: () => Promise<string[]>;
      startHost: (port: number) => Promise<{ ok: boolean; port?: number; error?: string }>;
      stopHost: () => Promise<{ ok: boolean }>;
      startDiscovery: (onFound: (host: FoundCoopHost) => void) => void;
      stopDiscovery: () => void;
    };
  }
}
