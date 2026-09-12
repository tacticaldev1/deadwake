import { WebSocketServer, WebSocket } from 'ws';
import { SessionServer } from './sessionServer';
import { ClientMessage, HostMessage } from '../../src/net/protocol';

export class LanServer {
  private wss: WebSocketServer;
  private session = new SessionServer();
  private sockets = new Map<string, WebSocket>();

  constructor(port: number) {
    this.wss = new WebSocketServer({ host: '0.0.0.0', port });

    this.wss.on('connection', (socket: WebSocket) => {
      const send = (msg: HostMessage) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
      };
      const playerId = this.session.onConnect(send);
      this.sockets.set(playerId, socket);

      socket.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as ClientMessage;
          this.session.onMessage(playerId, msg);
        } catch (err) {
          console.error('[coop] bad client message', err);
        }
      });

      socket.on('close', () => {
        this.sockets.delete(playerId);
        this.session.onDisconnect(playerId);
      });

      socket.on('error', (err: Error) => {
        console.error('[coop] socket error', err);
      });
    });
  }

  close() {
    const notice = JSON.stringify(this.session.closeNotice());
    for (const socket of this.sockets.values()) {
      if (socket.readyState === WebSocket.OPEN) socket.send(notice);
      socket.close();
    }
    this.sockets.clear();
    this.wss.close();
    this.session.dispose();
  }

  hasConnectedPlayers(): boolean {
    return this.session.hasConnectedPlayers();
  }
}
