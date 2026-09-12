import { ClientMessage, HostMessage } from './protocol';

export type NetStatus = 'connecting' | 'open' | 'closed';

// Thin wrapper over the browser's native WebSocket. Used identically by the
// host's own renderer window and by every joining player — connecting to a
// co-op session never requires Electron/Node privilege, just a plain
// WebSocket, so this class works the same in a packaged app or a browser tab.
export class NetClient {
  private socket: WebSocket;
  private statusListeners = new Set<(status: NetStatus) => void>();
  private messageListeners = new Set<(msg: HostMessage) => void>();
  status: NetStatus = 'connecting';

  constructor(url: string) {
    this.socket = new WebSocket(url);
    this.socket.onopen = () => this.setStatus('open');
    this.socket.onclose = () => this.setStatus('closed');
    this.socket.onerror = () => this.setStatus('closed');
    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as HostMessage;
        for (const listener of this.messageListeners) listener(msg);
      } catch (err) {
        console.error('[coop] bad host message', err);
      }
    };
  }

  private setStatus(status: NetStatus) {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  onStatusChange(cb: (status: NetStatus) => void) {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  onMessage(cb: (msg: HostMessage) => void) {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  send(msg: ClientMessage) {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(msg));
  }

  close() {
    this.socket.close();
  }
}
