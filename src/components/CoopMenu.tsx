import React, { useEffect, useState } from 'react';
import { NetClient } from '../net/NetClient';
import { DEFAULT_COOP_PORT } from '../net/protocol';
import { sfxButtonClick } from '../game/sfx';
import { FoundCoopHost } from '../net/window';

interface CoopMenuProps {
  onConnected: (client: NetClient) => void;
  onBack: () => void;
}

type Tab = 'host' | 'join';

// A found host is dropped from the list if we haven't heard its beacon in
// this long — keeps the list current if a host closes without a clean
// disconnect (app crash, network drop, laptop sleep).
const HOST_STALE_MS = 5000;

// Remembering the last address/port means a friend group that plays together
// regularly never has to re-type or re-share it after the first session.
const LAST_JOIN_KEY = 'deadwake_coop_last_join';
const LAST_PORT_KEY = 'deadwake_coop_last_port';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const CoopMenu: React.FC<CoopMenuProps> = ({ onConnected, onBack }) => {
  const [tab, setTab] = useState<Tab>('host');
  const [port, setPort] = useState(() => localStorage.getItem(LAST_PORT_KEY) || String(DEFAULT_COOP_PORT));
  const [lanIps, setLanIps] = useState<string[]>([]);
  const [joinAddress, setJoinAddress] = useState(() => localStorage.getItem(LAST_JOIN_KEY) || '');
  const [foundHosts, setFoundHosts] = useState<Record<string, FoundCoopHost & { lastSeen: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const isElectron = typeof window !== 'undefined' && !!window.coop;

  useEffect(() => {
    if (!isElectron) return;
    window.coop!.getLanIps().then(setLanIps).catch(() => setLanIps([]));
  }, [isElectron]);

  // Auto-discover hosts on the LAN while the Join tab is open, so joining is
  // "click a name" instead of "type an IP:port" whenever possible — manual
  // entry below still works as a fallback (different subnet, browser tab, etc).
  useEffect(() => {
    if (!isElectron || tab !== 'join') return;
    window.coop!.startDiscovery(host => {
      const key = `${host.ip}:${host.port}`;
      setFoundHosts(prev => ({ ...prev, [key]: { ...host, lastSeen: Date.now() } }));
    });
    const prune = setInterval(() => {
      setFoundHosts(prev => {
        const next = { ...prev };
        let changed = false;
        for (const [key, host] of Object.entries(next)) {
          if (Date.now() - host.lastSeen > HOST_STALE_MS) { delete next[key]; changed = true; }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => { window.coop!.stopDiscovery(); clearInterval(prune); setFoundHosts({}); };
  }, [isElectron, tab]);

  const startHost = async () => {
    if (!window.coop) { setError('Hosting requires the desktop app.'); return; }
    setBusy(true);
    setError(null);
    sfxButtonClick();
    localStorage.setItem(LAST_PORT_KEY, port);
    const result = await window.coop.startHost(parseInt(port, 10) || DEFAULT_COOP_PORT);
    if (!result.ok) {
      setError(result.error || 'Could not start hosting.');
      setBusy(false);
      return;
    }
    const client = new NetClient(`ws://localhost:${result.port}`);
    attachAndConnect(client);
  };

  const joinHost = (address?: string) => {
    const full = address ?? joinAddress;
    const [ip, portStr] = full.split(':');
    if (!ip) { setError('Enter the host\'s address, like 192.168.1.20:7777'); return; }
    setBusy(true);
    setError(null);
    sfxButtonClick();
    localStorage.setItem(LAST_JOIN_KEY, full);
    const client = new NetClient(`ws://${ip}:${portStr || DEFAULT_COOP_PORT}`);
    attachAndConnect(client);
  };

  const pasteAddress = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) { setJoinAddress(text); setError(null); }
    } catch {
      setError('Could not read the clipboard — paste manually instead.');
    }
  };

  const copyAddress = async (ip: string) => {
    const ok = await copyToClipboard(`${ip}:${port}`);
    if (ok) { setCopiedIp(ip); setTimeout(() => setCopiedIp(null), 1500); }
    else setError('Could not copy — select and copy the address manually.');
  };

  const attachAndConnect = (client: NetClient) => {
    const off = client.onStatusChange(status => {
      if (status === 'open') { off(); onConnected(client); }
      else if (status === 'closed') { off(); setBusy(false); setError('Could not connect. Check the address and try again.'); }
    });
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background">
      <div className="absolute inset-0 scanlines opacity-20" />
      <div className="animate-fade-in pixel-border bg-card/95 p-4 md:p-6 max-w-sm w-full mx-4 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[10px] text-primary">CO-OP</h2>
          <button onClick={() => { sfxButtonClick(); onBack(); }} className="font-body text-lg text-muted-foreground hover:text-foreground">[X]</button>
        </div>

        <div className="flex gap-0 mb-4 pixel-border">
          {(['host', 'join'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { sfxButtonClick(); setTab(t); setError(null); }}
              className={`flex-1 py-2 px-2 font-display text-[9px] transition-colors uppercase ${
                tab === t ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'host' ? (
          <div className="space-y-3">
            {!isElectron && (
              <p className="font-body text-sm text-destructive">Hosting only works from the desktop app — this browser tab can still join a friend's session on the Join tab.</p>
            )}
            <div>
              <label className="font-display text-[7px] text-muted-foreground block mb-1">PORT</label>
              <input type="number" value={port} onChange={e => setPort(e.target.value)}
                className="w-full bg-muted/50 border-2 border-border px-2 py-1 font-body text-sm text-foreground outline-none focus:border-primary" />
            </div>
            {lanIps.length > 0 && (
              <div className="pixel-border bg-secondary/20 p-3">
                <div className="font-display text-[7px] text-muted-foreground mb-1">GIVE FRIENDS THIS ADDRESS</div>
                {lanIps.map(ip => (
                  <div key={ip} className="flex items-center justify-between gap-2">
                    <span className="font-body text-base text-foreground">{ip}:{port}</span>
                    <button
                      onClick={() => copyAddress(ip)}
                      className="font-display text-[7px] px-2 py-1 pixel-btn bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shrink-0"
                    >
                      {copiedIp === ip ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={startHost} disabled={busy}
              className="w-full py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn hover:bg-primary/80 disabled:opacity-50">
              {busy ? 'STARTING…' : 'START HOSTING'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {isElectron && (
              <div>
                <label className="font-display text-[7px] text-muted-foreground block mb-1">
                  GAMES ON YOUR NETWORK
                </label>
                {Object.keys(foundHosts).length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground pixel-border bg-secondary/20 p-3">
                    Searching… make sure a friend has clicked START HOSTING.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(foundHosts).map(([key, host]) => (
                      <button
                        key={key}
                        onClick={() => joinHost(`${host.ip}:${host.port}`)}
                        disabled={busy}
                        className="w-full text-left pixel-border bg-secondary/20 hover:bg-secondary/40 px-3 py-2 transition-colors disabled:opacity-50"
                      >
                        <div className="font-body text-sm text-foreground">{host.name}'s game</div>
                        <div className="font-body text-xs text-muted-foreground">{host.ip}:{host.port}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="font-display text-[7px] text-muted-foreground block mb-1">
                {isElectron ? "OR ENTER ADDRESS MANUALLY" : 'HOST ADDRESS'}
              </label>
              <div className="flex gap-1.5">
                <input type="text" value={joinAddress} onChange={e => setJoinAddress(e.target.value)} placeholder="192.168.1.20:7777"
                  className="flex-1 min-w-0 bg-muted/50 border-2 border-border px-2 py-1 font-body text-sm text-foreground outline-none focus:border-primary" />
                <button
                  onClick={pasteAddress}
                  className="font-display text-[7px] px-2 pixel-btn bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shrink-0"
                >
                  PASTE
                </button>
              </div>
            </div>
            <button onClick={() => joinHost()} disabled={busy}
              className="w-full py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn hover:bg-primary/80 disabled:opacity-50">
              {busy ? 'CONNECTING…' : 'CONNECT'}
            </button>
          </div>
        )}

        {error && <p className="font-body text-sm text-destructive mt-3">{error}</p>}
      </div>
    </div>
  );
};

export default CoopMenu;
