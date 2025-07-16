// Real-time signaling service for cross-device WebRTC connections
import { UserInfo } from './signaling';

export interface RTCSignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-available' | 'connection-request' | 'connection-response' | 'disconnect';
  data: any;
  from: string;
  to?: string;
  userInfo?: UserInfo;
  timestamp: number;
}

class RealTimeSignalingService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (message: RTCSignalingMessage) => void> = new Map();
  private currentUser: UserInfo | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  constructor() {
    this.initializeUserInfo();
  }

  private async initializeUserInfo() {
    try {
      const userInfo = await this.getUserInfo();
      this.currentUser = userInfo;
      this.connect();
      console.log('Real-time signaling initialized with user info:', userInfo);
    } catch (error) {
      console.error('Failed to initialize user info:', error);
    }
  }

  private connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Using WebSocket.org's echo server for signaling
      this.ws = new WebSocket('wss://echo.websocket.org');
      
      this.ws.onopen = () => {
        console.log('Real-time signaling connected');
        this.reconnectAttempts = 0;
        
        // Announce user availability
        if (this.currentUser) {
          this.broadcastUserAvailable();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Only process messages from our signaling protocol
          if (message.type && message.from && message.from !== this.currentUser?.peerId) {
            console.log('Received signaling message:', message);
            this.handleMessage(message);
          }
        } catch (error) {
          console.log('Received non-signaling message, ignoring');
        }
      };

      this.ws.onclose = () => {
        console.log('Real-time signaling disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Real-time signaling error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect signaling (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleMessage(message: RTCSignalingMessage) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  private broadcastUserAvailable() {
    if (!this.currentUser) return;

    const message: RTCSignalingMessage = {
      type: 'user-available',
      data: { available: true },
      from: this.currentUser.peerId,
      userInfo: this.currentUser,
      timestamp: Date.now()
    };

    this.sendMessage(message);
  }

  private sendMessage(message: RTCSignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  // Public methods
  sendOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    const message: RTCSignalingMessage = {
      type: 'offer',
      data: { offer },
      from: this.currentUser?.peerId || '',
      to: peerId,
      userInfo: this.currentUser || undefined,
      timestamp: Date.now()
    };
    this.sendMessage(message);
  }

  sendAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const message: RTCSignalingMessage = {
      type: 'answer',
      data: { answer },
      from: this.currentUser?.peerId || '',
      to: peerId,
      userInfo: this.currentUser || undefined,
      timestamp: Date.now()
    };
    this.sendMessage(message);
  }

  sendIceCandidate(peerId: string, candidate: RTCIceCandidate) {
    const message: RTCSignalingMessage = {
      type: 'ice-candidate',
      data: { candidate },
      from: this.currentUser?.peerId || '',
      to: peerId,
      userInfo: this.currentUser || undefined,
      timestamp: Date.now()
    };
    this.sendMessage(message);
  }

  sendConnectionRequest(targetPeerId: string) {
    const message: RTCSignalingMessage = {
      type: 'connection-request',
      data: { requestConnection: true },
      from: this.currentUser?.peerId || '',
      to: targetPeerId,
      userInfo: this.currentUser || undefined,
      timestamp: Date.now()
    };
    this.sendMessage(message);
  }

  sendConnectionResponse(targetPeerId: string, accepted: boolean) {
    const message: RTCSignalingMessage = {
      type: 'connection-response',
      data: { accepted },
      from: this.currentUser?.peerId || '',
      to: targetPeerId,
      userInfo: this.currentUser || undefined,
      timestamp: Date.now()
    };
    this.sendMessage(message);
  }

  async findPartner(): Promise<UserInfo | null> {
    return new Promise((resolve) => {
      // Set up handlers for finding partners
      const handleUserAvailable = (message: RTCSignalingMessage) => {
        if (message.userInfo && message.userInfo.peerId !== this.currentUser?.peerId) {
          // Check if it's from a different IP
          if (message.userInfo.ip !== this.currentUser?.ip) {
            console.log('Found available partner:', message.userInfo);
            resolve(message.userInfo);
          }
        }
      };

      const handleConnectionResponse = (message: RTCSignalingMessage) => {
        if (message.data.accepted && message.userInfo) {
          console.log('Partner accepted connection:', message.userInfo);
          resolve(message.userInfo);
        }
      };

      // Set up temporary handlers
      this.onMessage('user-available', handleUserAvailable);
      this.onMessage('connection-response', handleConnectionResponse);

      // Broadcast availability
      this.broadcastUserAvailable();

      // Timeout after 10 seconds
      setTimeout(() => {
        this.messageHandlers.delete('user-available');
        this.messageHandlers.delete('connection-response');
        resolve(null);
      }, 10000);
    });
  }

  onMessage(type: string, handler: (message: RTCSignalingMessage) => void) {
    this.messageHandlers.set(type, handler);
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUser;
  }

  private async getUserInfo(): Promise<UserInfo> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        peerId: this.generatePeerId(),
        ip: data.ip || 'Unknown',
        country: data.country_name || 'Unknown',
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        peerId: this.generatePeerId(),
        ip: 'Unknown',
        country: 'Unknown',
        city: 'Unknown',
        region: 'Unknown',
        timestamp: Date.now()
      };
    }
  }

  private generatePeerId(): string {
    return `peer-${Math.random().toString(36).substr(2, 9)}`;
  }

  disconnect() {
    if (this.ws) {
      this.sendMessage({
        type: 'disconnect',
        data: { reason: 'user-disconnect' },
        from: this.currentUser?.peerId || '',
        timestamp: Date.now()
      });
      
      this.ws.close();
      this.ws = null;
    }
  }
}

export const realTimeSignalingService = new RealTimeSignalingService();