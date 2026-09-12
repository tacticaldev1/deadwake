import os from 'node:os';

// LAN-reachable IPv4 addresses for this machine, so the host can tell friends
// which address to type in. Filters out loopback and virtual/internal-only
// adapters as best-effort (Docker, Hyper-V, WSL, etc. are commonly named
// with these prefixes on Windows) — not foolproof, just a friendlier list.
const IGNORED_PREFIXES = ['docker', 'vethernet', 'wsl', 'virtualbox', 'vmware', 'loopback'];

export function getLanIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    if (IGNORED_PREFIXES.some(p => name.toLowerCase().includes(p))) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
    }
  }
  return ips;
}
