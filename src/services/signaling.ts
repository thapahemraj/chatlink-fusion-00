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
      // Using a free WebSocket service for signaling
      this.ws = new WebSocket('wss://echo.websocket.org');
      
      this.ws.onopen = () => {
        console.log('Connected to signaling server');
        this.reconnectAttempts = 0;
        // Register user
        this.sendWebSocketMessage({
          type: 'user-register',
          data: { userInfo: this.currentUser }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: SignalingMessage = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
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

  private handleWebSocketMessage(message: SignalingMessage) {
    console.log('Received WebSocket message:', message);
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
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
    
    // Update peer discovery service with current user
    peerDiscoveryService.setCurrentUser(this.currentUser);
    
    // Use peer discovery service to find partners
    const partner = await peerDiscoveryService.findPartner();
    
    if (partner) {
      console.log('Partner found:', partner);
      return partner;
    } else {
      console.log('No partner found');
      return null;
    }
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