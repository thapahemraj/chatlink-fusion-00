// Peer discovery service using WebSocket for cross-device connections
import { UserInfo, SignalingMessage } from './signaling';

interface PeerRoom {
  id: string;
  users: UserInfo[];
  createdAt: number;
}

class PeerDiscoveryService {
  private ws: WebSocket | null = null;
  private currentUser: UserInfo | null = null;
  private waitingUsers = new Map<string, UserInfo>();
  private onPartnerFoundCallback: ((partner: UserInfo) => void) | null = null;
  private onNoPartnerCallback: (() => void) | null = null;
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // Use a public WebSocket service that echoes messages
      this.ws = new WebSocket('wss://echo.websocket.org');
      
      this.ws.onopen = () => {
        console.log('Connected to peer discovery service');
        this.isConnected = true;
        
        // Broadcast that we're looking for peers
        this.broadcastAvailability();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Peer discovery connection closed');
        this.isConnected = false;
        // Attempt to reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (error) => {
        console.error('Peer discovery error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to peer discovery:', error);
      setTimeout(() => this.connect(), 3000);
    }
  }

  private broadcastAvailability() {
    if (!this.currentUser || !this.isConnected) return;

    const message = {
      type: 'peer-available',
      userInfo: this.currentUser,
      timestamp: Date.now()
    };

    this.sendMessage(message);
  }

  private sendMessage(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(data: any) {
    if (!data.type || !data.userInfo) return;

    switch (data.type) {
      case 'peer-available':
        this.handlePeerAvailable(data.userInfo);
        break;
      case 'peer-response':
        this.handlePeerResponse(data.userInfo);
        break;
    }
  }

  private handlePeerAvailable(peerInfo: UserInfo) {
    // Don't connect to ourselves
    if (!this.currentUser || peerInfo.peerId === this.currentUser.peerId) return;
    
    // Don't connect to same IP (prevent duplicate connections)
    if (peerInfo.ip === this.currentUser.ip) return;

    // If we're looking for a partner, respond to this peer
    if (this.onPartnerFoundCallback) {
      this.sendMessage({
        type: 'peer-response',
        userInfo: this.currentUser,
        targetPeer: peerInfo.peerId,
        timestamp: Date.now()
      });

      // Connect with this peer
      this.onPartnerFoundCallback(peerInfo);
      this.onPartnerFoundCallback = null;
    }
  }

  private handlePeerResponse(peerInfo: UserInfo) {
    // If we're looking for a partner and this is a valid response
    if (this.onPartnerFoundCallback && this.currentUser && peerInfo.peerId !== this.currentUser.peerId) {
      this.onPartnerFoundCallback(peerInfo);
      this.onPartnerFoundCallback = null;
    }
  }

  setCurrentUser(userInfo: UserInfo) {
    this.currentUser = userInfo;
    if (this.isConnected) {
      this.broadcastAvailability();
    }
  }

  findPartner(): Promise<UserInfo | null> {
    return new Promise((resolve) => {
      if (!this.currentUser) {
        resolve(null);
        return;
      }

      this.onPartnerFoundCallback = (partner: UserInfo) => {
        resolve(partner);
      };

      this.onNoPartnerCallback = () => {
        resolve(null);
      };

      // Broadcast that we're available for connection
      this.broadcastAvailability();

      // If no partner found in 10 seconds, resolve with null
      setTimeout(() => {
        if (this.onPartnerFoundCallback) {
          this.onPartnerFoundCallback = null;
          this.onNoPartnerCallback = null;
          resolve(null);
        }
      }, 10000);
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.onPartnerFoundCallback = null;
    this.onNoPartnerCallback = null;
  }
}

export const peerDiscoveryService = new PeerDiscoveryService();