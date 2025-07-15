// Enhanced signaling service for real peer-to-peer connections
import { peerDiscoveryService } from './peerDiscovery';

export interface UserInfo {
  peerId: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  timestamp: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'peer-joined' | 'peer-left' | 'find-partner' | 'partner-found' | 'no-partner' | 'user-info';
  data: any;
  roomId?: string;
  peerId?: string;
  targetPeerId?: string;
  userInfo?: UserInfo;
}

class SignalingService {
  private messageHandlers: Map<string, (message: SignalingMessage) => void> = new Map();
  private ws: WebSocket | null = null;
  private currentUser: UserInfo | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.initializeUserInfo();
  }

  private async initializeUserInfo() {
    try {
      const userInfo = await this.getUserInfo();
      this.currentUser = userInfo;
      this.connectWebSocket();
      console.log('Initializing signaling with user info:', userInfo);
    } catch (error) {
      console.error('Failed to get user info:', error);
    }
  }

  private connectWebSocket() {
    try {
      // Using a more reliable WebSocket service for signaling
      this.ws = new WebSocket('wss://socketsbay.com/wss/v2/1/demo/');
      
      this.ws.onopen = () => {
        console.log('Connected to signaling server');
        this.reconnectAttempts = 0;
        // Register user with IP filtering
        if (this.currentUser) {
          this.broadcastUserAvailable();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Only process messages that are for our signaling protocol
          if (message.type && message.userInfo) {
            this.handleWebSocketMessage(message);
          }
        } catch (error) {
          // Ignore non-JSON messages from the WebSocket service
          console.log('Received non-signaling message, ignoring');
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private broadcastUserAvailable() {
    if (!this.currentUser) return;
    
    const message = {
      type: 'user-available',
      userInfo: this.currentUser,
      timestamp: Date.now()
    };
    
    this.sendWebSocketMessage(message);
    console.log('Broadcasting user availability:', this.currentUser);
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connectWebSocket();
      }, 2000 * this.reconnectAttempts);
    }
  }

  private sendWebSocketMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleWebSocketMessage(message: any) {
    console.log('Received WebSocket message:', message);
    
    // Handle different message types
    switch (message.type) {
      case 'user-available':
        this.handleUserAvailable(message.userInfo);
        break;
      case 'connection-request':
        this.handleConnectionRequest(message);
        break;
      case 'connection-response':
        this.handleConnectionResponse(message);
        break;
      default:
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
          handler(message);
        }
    }
  }

  private handleUserAvailable(userInfo: UserInfo) {
    // Don't connect to ourselves or same IP
    if (!this.currentUser || 
        userInfo.peerId === this.currentUser.peerId || 
        userInfo.ip === this.currentUser.ip) {
      return;
    }

    console.log('Found available user:', userInfo);
    
    // Send connection request
    this.sendWebSocketMessage({
      type: 'connection-request',
      userInfo: this.currentUser,
      targetUser: userInfo,
      timestamp: Date.now()
    });
  }

  private handleConnectionRequest(message: any) {
    if (!this.currentUser || message.targetUser.peerId !== this.currentUser.peerId) {
      return;
    }

    console.log('Received connection request from:', message.userInfo);
    
    // Accept the connection
    this.sendWebSocketMessage({
      type: 'connection-response',
      userInfo: this.currentUser,
      targetUser: message.userInfo,
      accepted: true,
      timestamp: Date.now()
    });

    // Notify partner found
    const handler = this.messageHandlers.get('partner-found');
    if (handler) {
      handler({ type: 'partner-found', data: message.userInfo });
    }
  }

  private handleConnectionResponse(message: any) {
    if (!this.currentUser || message.targetUser.peerId !== this.currentUser.peerId) {
      return;
    }

    if (message.accepted) {
      console.log('Connection accepted by:', message.userInfo);
      
      // Notify partner found
      const handler = this.messageHandlers.get('partner-found');
      if (handler) {
        handler({ type: 'partner-found', data: message.userInfo });
      }
    }
  }

  private async getUserInfo(): Promise<UserInfo> {
    try {
      // Get IP and location info
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
      // Fallback if IP service fails
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
    return Math.random().toString(36).substr(2, 9);
  }

  sendMessage(message: SignalingMessage) {
    console.log('Sending message:', message);
    
    // Add user info and timestamp to all messages
    const messageWithInfo = {
      ...message,
      userInfo: this.currentUser || undefined,
      timestamp: Date.now()
    };
    
    this.sendWebSocketMessage(messageWithInfo);
  }

  onMessage(type: string, handler: (message: SignalingMessage) => void) {
    this.messageHandlers.set(type, handler);
  }

  async findPartner(): Promise<UserInfo | null> {
    if (!this.currentUser) return null;
    
    return new Promise((resolve) => {
      // Set up partner found handler
      this.onMessage('partner-found', (message) => {
        resolve(message.data);
      });

      // Broadcast availability to find partners
      this.broadcastUserAvailable();
      
      // Timeout after 10 seconds
      setTimeout(() => {
        resolve(null);
      }, 10000);
    });
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUser;
  }

  joinRoom(roomId: string, peerId: string) {
    this.sendMessage({
      type: 'join-room',
      data: { roomId, peerId }
    });
  }

  disconnect() {
    if (this.ws) {
      this.sendWebSocketMessage({
        type: 'user-disconnect',
        data: { peerId: this.currentUser?.peerId }
      });
      this.ws.close();
      this.ws = null;
    }
    
    // Also disconnect from peer discovery
    peerDiscoveryService.disconnect();
  }
}

export const signalingService = new SignalingService();