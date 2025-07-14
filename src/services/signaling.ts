// Enhanced signaling service for real peer-to-peer connections
export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'peer-joined' | 'peer-left';
  data: any;
  roomId?: string;
  peerId?: string;
  targetPeerId?: string;
}

class SignalingService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, (message: SignalingMessage) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // For production, replace with your signaling server URL
      // For now, we'll use a public WebSocket testing service
      this.socket = new WebSocket('wss://echo.websocket.org');

      this.socket.onopen = () => {
        console.log('Connected to signaling server');
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const message: SignalingMessage = JSON.parse(event.data);
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message);
          }
        } catch (error) {
          console.error('Error parsing signaling message:', error);
        }
      };

      this.socket.onclose = () => {
        console.log('Disconnected from signaling server');
        this.reconnect();
      };

      this.socket.onerror = (error) => {
        console.error('Signaling server error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  sendMessage(message: SignalingMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('Signaling server not connected');
    }
  }

  onMessage(type: string, handler: (message: SignalingMessage) => void) {
    this.messageHandlers.set(type, handler);
  }

  joinRoom(roomId: string, peerId: string) {
    this.sendMessage({
      type: 'join-room',
      data: { roomId, peerId }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const signalingService = new SignalingService();