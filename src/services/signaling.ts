// Enhanced signaling service for real peer-to-peer connections
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
  private connectedUsers: Map<string, UserInfo> = new Map();
  private waitingUsers: UserInfo[] = [];
  private currentUser: UserInfo | null = null;

  constructor() {
    this.initializeUserInfo();
  }

  private async initializeUserInfo() {
    try {
      const userInfo = await this.getUserInfo();
      this.currentUser = userInfo;
      console.log('Connected to signaling server', userInfo);
    } catch (error) {
      console.error('Failed to get user info:', error);
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

  private simulateMessage(message: SignalingMessage) {
    // Simulate server behavior locally
    setTimeout(() => {
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }
    }, 100);
  }

  sendMessage(message: SignalingMessage) {
    // For now, simulate server behavior locally since we don't have a real signaling server
    console.log('Sending message:', message);
    
    if (message.type === 'find-partner') {
      this.handleFindPartner();
    } else {
      this.simulateMessage(message);
    }
  }

  private handleFindPartner() {
    if (!this.currentUser) return;

    // Check for duplicate IP (simple duplicate prevention)
    const existingUser = this.waitingUsers.find(user => user.ip === this.currentUser?.ip);
    if (existingUser) {
      this.simulateMessage({
        type: 'no-partner',
        data: { reason: 'duplicate_ip' }
      });
      return;
    }

    // Check if there are other waiting users
    if (this.waitingUsers.length > 0) {
      const partner = this.waitingUsers.shift()!;
      
      // Remove current user from waiting list if they were there
      this.waitingUsers = this.waitingUsers.filter(user => user.peerId !== this.currentUser?.peerId);
      
      // Connect users
      this.simulateMessage({
        type: 'partner-found',
        data: { partner },
        userInfo: this.currentUser
      });
    } else {
      // Add to waiting list
      this.waitingUsers.push(this.currentUser);
      
      // Simulate no partner found after a delay
      setTimeout(() => {
        this.simulateMessage({
          type: 'no-partner',
          data: { reason: 'no_users_available' }
        });
      }, 3000);
    }
  }

  onMessage(type: string, handler: (message: SignalingMessage) => void) {
    this.messageHandlers.set(type, handler);
  }

  findPartner(): Promise<UserInfo | null> {
    return new Promise((resolve) => {
      const handlePartnerFound = (message: SignalingMessage) => {
        this.messageHandlers.delete('partner-found');
        this.messageHandlers.delete('no-partner');
        resolve(message.data.partner);
      };

      const handleNoPartner = (message: SignalingMessage) => {
        this.messageHandlers.delete('partner-found');
        this.messageHandlers.delete('no-partner');
        resolve(null);
      };

      this.onMessage('partner-found', handlePartnerFound);
      this.onMessage('no-partner', handleNoPartner);

      this.sendMessage({
        type: 'find-partner',
        data: {},
        userInfo: this.currentUser || undefined
      });
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
    if (this.currentUser) {
      // Remove from waiting list
      this.waitingUsers = this.waitingUsers.filter(user => user.peerId !== this.currentUser?.peerId);
    }
  }
}

export const signalingService = new SignalingService();