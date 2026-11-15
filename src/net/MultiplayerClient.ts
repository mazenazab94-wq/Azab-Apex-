import {
  KartLoadout,
  PowerUpType,
  RemoteKartNetState,
  RoomState,
} from '../types/game';

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface MultiplayerCallbacks {
  onStatus?: (status: WsConnectionStatus) => void;
  onRoomState?: (room: RoomState | null) => void;
  onRoomError?: (msg: string) => void;
  onKicked?: (reason: string) => void;
  onRaceStart?: (room: RoomState) => void;
  onRemoteStates?: (states: RemoteKartNetState[]) => void;
  onRemotePowerUp?: (data: {
    ownerId: string;
    type: PowerUpType;
    x: number;
    y: number;
    z: number;
    heading: number;
    trackT: number;
  }) => void;
  onRemoteCrash?: (playerId: string) => void;
}

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private status: WsConnectionStatus = 'disconnected';
  private callbacks: MultiplayerCallbacks = {};
  private reconnectTimer: number | null = null;
  private authPayload: { playerId: string; name: string; tag: string; loadout: KartLoadout } | null = null;
  private pendingMessages: { type: string; payload: unknown }[] = [];

  public setCallbacks(cb: MultiplayerCallbacks) {
    this.callbacks = cb;
  }

  public connect(auth: { playerId: string; name: string; tag: string; loadout: KartLoadout }) {
    this.authPayload = auth;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send('auth', auth);
      }
      return;
    }

    this.setStatus('connecting');
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus('connected');
      if (this.authPayload) {
        this.sendImmediate('auth', this.authPayload);
      }
      while (this.pendingMessages.length > 0) {
        const m = this.pendingMessages.shift()!;
        this.sendImmediate(m.type, m.payload);
      }
    };

    ws.onmessage = (evt) => {
      try {
        const { type, payload } = JSON.parse(evt.data);
        if (type === 'auth:ok') {
          if (payload.reconnectedRoom) {
            this.callbacks.onRoomState?.(payload.reconnectedRoom);
          }
        } else if (type === 'room:state') {
          this.callbacks.onRoomState?.(payload);
        } else if (type === 'room:left') {
          this.callbacks.onRoomState?.(null);
        } else if (type === 'room:kicked') {
          this.callbacks.onRoomState?.(null);
          this.callbacks.onKicked?.(payload.reason || 'Kicked from room');
        } else if (type === 'room:error') {
          this.callbacks.onRoomError?.(payload.message);
        } else if (type === 'race:start') {
          this.callbacks.onRaceStart?.(payload);
        } else if (type === 'race:states') {
          this.callbacks.onRemoteStates?.(payload);
        } else if (type === 'race:powerup') {
          this.callbacks.onRemotePowerUp?.(payload);
        } else if (type === 'race:crash') {
          this.callbacks.onRemoteCrash?.(payload.playerId);
        }
      } catch {
        // ignore malformed packet
      }
    };

    ws.onclose = () => {
      this.setStatus('disconnected');
      this.ws = null;
      if (this.authPayload && !this.reconnectTimer) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          if (this.authPayload) this.connect(this.authPayload);
        }, 2500);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private setStatus(s: WsConnectionStatus) {
    this.status = s;
    this.callbacks.onStatus?.(s);
  }

  public getStatus(): WsConnectionStatus {
    return this.status;
  }

  private sendImmediate(type: string, payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  public send(type: string, payload: unknown = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendImmediate(type, payload);
    } else {
      this.pendingMessages.push({ type, payload });
      if (this.authPayload && !this.ws) {
        this.connect(this.authPayload);
      }
    }
  }

  public disconnect() {
    this.authPayload = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}

export const multiplayerClient = new MultiplayerClient();
