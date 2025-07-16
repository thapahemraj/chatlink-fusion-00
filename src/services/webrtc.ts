// Enhanced WebRTC service with real IP-based connections
import { realTimeSignalingService, RTCSignalingMessage } from './realTimeSignaling';

export interface PeerConnection {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  remoteStream: MediaStream | null;
  polite: boolean;
  isConnected: boolean;
}

class WebRTCService {
  private connections: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private onMessageCallbacks: Array<(peerId: string, message: any) => void> = [];
  private onStreamCallbacks: Array<(peerId: string, stream: MediaStream) => void> = [];
  private onConnectionStateChangeCallbacks: Array<(peerId: string, state: RTCPeerConnectionState) => void> = [];

  private currentRoomId: string | null = null;
  private peerId: string = `peer-${Math.random().toString(36).substr(2, 9)}`;

  constructor() {
    this.setupSignaling();
  }

  // Get user media (camera and microphone)
  async getLocalStream() {
    if (this.localStream) return this.localStream;
    
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw error;
    }
  }

  // Setup real signaling for peer discovery
  private setupSignaling() {
    realTimeSignalingService.onMessage('offer', this.handleOffer.bind(this));
    realTimeSignalingService.onMessage('answer', this.handleAnswer.bind(this));
    realTimeSignalingService.onMessage('ice-candidate', this.handleIceCandidate.bind(this));
    realTimeSignalingService.onMessage('connection-request', this.handleConnectionRequest.bind(this));
    realTimeSignalingService.onMessage('user-available', this.handleUserAvailable.bind(this));
  }

  private async handleOffer(message: RTCSignalingMessage) {
    const { offer } = message.data;
    if (!message.from || message.from === this.peerId) return;

    const peerConnection = this.getOrCreatePeerConnection(message.from);
    
    try {
      await peerConnection.pc.setRemoteDescription(offer);
      const answer = await peerConnection.pc.createAnswer();
      await peerConnection.pc.setLocalDescription(answer);
      
      realTimeSignalingService.sendAnswer(message.from, answer);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  private async handleAnswer(message: RTCSignalingMessage) {
    const { answer } = message.data;
    if (!message.from || message.from === this.peerId) return;

    const peerConnection = this.connections.get(message.from);
    if (peerConnection) {
      try {
        await peerConnection.pc.setRemoteDescription(answer);
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    }
  }

  private async handleIceCandidate(message: RTCSignalingMessage) {
    const { candidate } = message.data;
    if (!message.from || message.from === this.peerId) return;

    const peerConnection = this.connections.get(message.from);
    if (peerConnection && candidate) {
      try {
        await peerConnection.pc.addIceCandidate(candidate);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    }
  }

  private handleConnectionRequest(message: RTCSignalingMessage) {
    if (!message.from || message.from === this.peerId) return;
    
    console.log(`Connection request from: ${message.from}`);
    
    // Accept the connection and start WebRTC
    realTimeSignalingService.sendConnectionResponse(message.from, true);
    this.createOffer(message.from);
  }

  private handleUserAvailable(message: RTCSignalingMessage) {
    if (!message.from || message.from === this.peerId) return;
    
    console.log(`User available: ${message.from}`);
    
    // Send connection request to available user
    realTimeSignalingService.sendConnectionRequest(message.from);
  }

  private async createOffer(peerId: string) {
    const peerConnection = this.getOrCreatePeerConnection(peerId);
    
    try {
      const offer = await peerConnection.pc.createOffer();
      await peerConnection.pc.setLocalDescription(offer);
      
      realTimeSignalingService.sendOffer(peerId, offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  // Connect to a random user using real WebRTC
  async connectToRandomUser(): Promise<string | null> {
    try {
      const partner = await realTimeSignalingService.findPartner();
      
      if (partner) {
        // Start the connection process
        this.createOffer(partner.peerId);
        return partner.peerId;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Failed to connect to random user:', error);
      return null;
    }
  }

  // Get or create a peer connection
  private getOrCreatePeerConnection(peerId: string): PeerConnection {
    let peerConnection = this.connections.get(peerId);
    if (peerConnection) {
      return peerConnection;
    }
    
    return this.setupPeerConnection(peerId);
  }

  // Set up a peer connection with enhanced ICE servers for cross-device connections
  private setupPeerConnection(peerId: string): PeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.nextcloud.com:443' },
        // Add TURN servers for better NAT traversal
        { 
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        },
        { 
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    });
    
    // Create data channel
    const dc = pc.createDataChannel('chat');
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessageCallbacks.forEach(callback => {
          callback(peerId, data);
        });
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    };
    
    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }
    
    // Handle ICE candidates with real signaling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        realTimeSignalingService.sendIceCandidate(peerId, event.candidate);
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state changed: ${pc.connectionState}`);
      const peerConnection = this.connections.get(peerId);
      if (peerConnection) {
        peerConnection.isConnected = pc.connectionState === 'connected';
      }
      
      this.onConnectionStateChangeCallbacks.forEach(callback => {
        callback(peerId, pc.connectionState);
      });
    };
    
    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('Received remote track');
      const [remoteStream] = event.streams;
      
      const peerConnection = this.connections.get(peerId);
      if (peerConnection) {
        peerConnection.remoteStream = remoteStream;
        
        this.onStreamCallbacks.forEach(callback => {
          callback(peerId, remoteStream);
        });
      }
    };
    
    const connection: PeerConnection = {
      pc,
      dc,
      remoteStream: null,
      polite: true,
      isConnected: false
    };
    
    this.connections.set(peerId, connection);
    
    return connection;
  }

  // Disconnect from a peer
  disconnectFromPeer(peerId: string) {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) return;
    
    const { pc, dc } = peerConnection;
    
    if (dc) {
      dc.close();
    }
    
    pc.close();
    this.connections.delete(peerId);
    
    console.log(`Disconnected from peer: ${peerId}`);
  }

  // Send a chat message to a peer
  sendMessage(peerId: string, message: any) {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection || !peerConnection.dc) return false;
    
    try {
      peerConnection.dc.send(JSON.stringify(message));
      return true;
    } catch (e) {
      console.error('Error sending message:', e);
      return false;
    }
  }

  // Get a peer's remote stream
  getRemoteStream(peerId: string): MediaStream | null {
    const peerConnection = this.connections.get(peerId);
    return peerConnection ? peerConnection.remoteStream : null;
  }

  // Control local media tracks
  toggleAudio(enabled: boolean) {
    if (!this.localStream) return;
    const audioTracks = this.localStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = enabled;
    });
  }

  toggleVideo(enabled: boolean) {
    if (!this.localStream) return;
    const videoTracks = this.localStream.getVideoTracks();
    videoTracks.forEach(track => {
      track.enabled = enabled;
    });
  }

  // Clean up all connections and media
  cleanup() {
    // Close all peer connections
    this.connections.forEach((connection, peerId) => {
      this.disconnectFromPeer(peerId);
    });
    
    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  // Event handlers
  onMessage(callback: (peerId: string, message: any) => void) {
    this.onMessageCallbacks.push(callback);
    return () => {
      this.onMessageCallbacks = this.onMessageCallbacks.filter(cb => cb !== callback);
    };
  }

  onStream(callback: (peerId: string, stream: MediaStream) => void) {
    this.onStreamCallbacks.push(callback);
    return () => {
      this.onStreamCallbacks = this.onStreamCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectionStateChange(callback: (peerId: string, state: RTCPeerConnectionState) => void) {
    this.onConnectionStateChangeCallbacks.push(callback);
    return () => {
      this.onConnectionStateChangeCallbacks = this.onConnectionStateChangeCallbacks.filter(cb => cb !== callback);
    };
  }
}

// Singleton instance
const webRTCService = new WebRTCService();
export default webRTCService;
