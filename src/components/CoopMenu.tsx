import React, { useEffect, useRef, useState } from 'react';
import { NetClient } from '../net/NetClient';
import { DEFAULT_COOP_PORT } from '../net/protocol';
import { sfxButtonClick, sfxCoopReady } from '../game/sfx';
import { FoundCoopHost } from '../net/window';

interface CoopMenuProps {
  onConnected: (client: NetClient, hostCode?: string) => void;
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

// Join codes are 4 characters from the host's Crockford-ish alphabet
// (see electron/main.ts's generateJoinCode) — this only needs to recognize
// "looks like a code, not an address" well enough to route the input.
const CODE_PATTERN = /^[A-Z2-9]{4}$/i;

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
  const [copiedCode, setCopiedCode] = useState(false);
  const [hostState, setHostState] = useState<{ status: 'starting' | 'ready' | 'error'; port?: number; code?: string }>({ status: 'starting' });
  const isElectron = typeof window !== 'undefined' && !!window.coop;
  const hostStartedRef = useRef(false);

  useEffect(() => {
    if (!isElectron) return;
    window.coop!.getLanIps().then(setLanIps).catch(() => setLanIps([]));
  }, [isElectron]);

  // Auto-start the server the moment this screen opens — hosting a game
  // shouldn't require finding and clicking a button first. The host still
  // chooses when to actually sail in via ENTER GAME below, so there's time
  // to read/share the join code before it scrolls away into gameplay.
  useEffect(() => {
    if (!isElectron || hostStartedRef.current) return;
    hostStartedRef.current = true;
    (async () => {
      localStorage.setItem(LAST_PORT_KEY, port);
      const result = await window.coop!.startHost(parseInt(port, 10) || DEFAULT_COOP_PORT);
      if (!result.ok) {
        setHostState({ status: 'error' });
        setError(result.error || 'Could not start hosting.');
        return;
      }
      setHostState({ status: 'ready', port: result.port, code: result.code });
      sfxCoopReady();
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    })();
    // Intentionally runs once on mount only (port is captured from the value at that time).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isElectron]);

  // Auto-discover hosts on the LAN while the Join tab is open, so joining is
  // "click a name" (or type the 4-letter code it shows) instead of "type an
  // IP:port" whenever possible — manual entry below still works as a
  // fallback (different subnet, browser tab, etc).
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

  const enterOwnGame = () => {
    if (hostState.status !== 'ready' || !hostState.port) return;
    setBusy(true);
    setError(null);
    sfxButtonClick();
    const client = new NetClient(`ws://localhost:${hostState.port}`);
    attachAndConnect(client, hostState.code);
  };

  const joinHost = (address?: string) => {
    const raw = (address ?? joinAddress).trim();
    if (!raw) { setError('Enter a join code or the host\'s address, like 192.168.1.20:7777'); return; }

    let target = raw;
    if (!address && CODE_PATTERN.test(raw)) {
      const match = Object.values(foundHosts).find(h => h.code.toUpperCase() === raw.toUpperCase());
      if (!match) {
        setError(`No game found on this network for code ${raw.toUpperCase()} yet — make sure the host has this screen open, or ask them for their IP address instead.`);
        return;
      }
      target = `${match.ip}:${match.port}`;
    }

    const [ip, portStr] = target.split(':');
    if (!ip) { setError('Enter a join code or the host\'s address, like 192.168.1.20:7777'); return; }
    setBusy(true);
    setError(null);
    sfxButtonClick();
    localStorage.setItem(LAST_JOIN_KEY, raw);
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
    const ok = await copyToClipboard(`${ip}:${hostState.port ?? port}`);
    if (ok) { setCopiedIp(ip); setTimeout(() => setCopiedIp(null), 1500); }
    else setError('Could not copy — select and copy the address manually.');
  };

  const copyCode = async () => {
    if (!hostState.code) return;
    const ok = await copyToClipboard(hostState.code);
    if (ok) { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1500); }
    else setError('Could not copy — select and copy the code manually.');
  };

  const attachAndConnect = (client: NetClient, hostCode?: string) => {
    const off = client.onStatusChange(status => {
      if (status === 'open') { off(); onConnected(client, hostCode); }
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
            {isElectron && hostState.status === 'starting' && (
              <p className="font-body text-sm text-muted-foreground pixel-border bg-secondary/20 p-3 animate-pulse">Starting your game…</p>
            )}
            {isElectron && hostState.status === 'ready' && (
              <>
                <div className="pixel-border bg-primary/10 p-4 text-center">
                  <div className="font-display text-[7px] text-muted-foreground mb-2">JOIN CODE</div>
                  <div className="font-display text-2xl text-primary tracking-[0.3em] mb-3 select-all">{hostState.code}</div>
                  <button
                    onClick={copyCode}
                    className="font-display text-[7px] px-3 py-1.5 pixel-btn bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                  >
                    {copiedCode ? 'COPIED' : 'COPY CODE'}
                  </button>
                  <p className="font-body text-xs text-muted-foreground mt-2">Friends on your network: Join tab → type this code.</p>
                </div>
                {lanIps.length > 0 && (
                  <div className="pixel-border bg-secondary/20 p-3">
                    <div className="font-display text-[7px] text-muted-foreground mb-1">OR, THIS ADDRESS DIRECTLY</div>
                    {lanIps.map(ip => (
                      <div key={ip} className="flex items-center justify-between gap-2">
                        <span className="font-body text-base text-foreground">{ip}:{hostState.port}</span>
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
                <button onClick={enterOwnGame} disabled={busy}
                  className="w-full py-3 bg-primary text-primary-foreground font-display text-[10px] pixel-btn hover:bg-primary/80 disabled:opacity-50">
                  {busy ? 'ENTERING…' : 'ENTER GAME'}
                </button>
              </>
            )}
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
                    Searching… make sure a friend has this screen open.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(foundHosts).map(([key, host]) => (
                      <button
                        key={key}
                        onClick={() => joinHost(`${host.ip}:${host.port}`)}
                        disabled={busy}
                        className="w-full text-left pixel-border bg-secondary/20 hover:bg-secondary/40 px-3 py-2 transition-colors disabled:opacity-50 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-body text-sm text-foreground">{host.name}'s game</div>
                          <div className="font-body text-xs text-muted-foreground">{host.ip}:{host.port}</div>
                        </div>
                        <div className="font-display text-sm text-primary tracking-widest shrink-0">{host.code}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="font-display text-[7px] text-muted-foreground block mb-1">
                {isElectron ? 'OR ENTER A JOIN CODE / ADDRESS' : 'HOST ADDRESS'}
              </label>
              <div className="flex gap-1.5">
                <input type="text" value={joinAddress} onChange={e => setJoinAddress(e.target.value)} placeholder="K7X9 or 192.168.1.20:7777"
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
