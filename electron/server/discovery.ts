import dgram from 'node:dgram';
import os from 'node:os';

// LAN host auto-discovery so joiners don't have to type an IP:port by hand.
// Deliberately separate from the game's own WebSocket port (lanServer.ts) —
// this is a tiny best-effort UDP broadcast beacon, not part of the session
// protocol, so it can be safely ignored by anything that doesn't understand it.
export const DISCOVERY_PORT = 7778;
const BEACON_INTERVAL_MS = 1500;
const MAGIC = 'deadwake-coop';

export interface Beacon {
  type: typeof MAGIC;
  name: string;
  port: number;
  code: string;
}

export interface FoundHost {
  ip: string;
  port: number;
  name: string;
  code: string;
}

export function startBeacon(port: number, code: string): () => void {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const name = os.hostname();
  let ready = false;

  socket.on('error', () => {}); // best-effort — discovery failing must never break hosting
  socket.bind(() => {
    socket.setBroadcast(true);
    ready = true;
  });

  const payload = Buffer.from(JSON.stringify({ type: MAGIC, name, port, code } satisfies Beacon));
  const timer = setInterval(() => {
    if (!ready) return;
    socket.send(payload, DISCOVERY_PORT, '255.255.255.255');
  }, BEACON_INTERVAL_MS);

  return () => {
    clearInterval(timer);
    socket.close();
  };
}

export function startListening(onFound: (host: FoundHost) => void): () => void {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  socket.on('error', () => {});
  socket.on('message', (msg, rinfo) => {
    try {
      const parsed = JSON.parse(msg.toString('utf-8')) as Beacon;
      if (parsed.type !== MAGIC) return;
      onFound({ ip: rinfo.address, port: parsed.port, name: parsed.name, code: parsed.code });
    } catch {
      // ignore malformed/foreign UDP traffic on this port
    }
  });
  socket.bind(DISCOVERY_PORT);

  return () => socket.close();
}
