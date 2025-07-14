// This is a simplified WebRTC service for demo purposes

export interface PeerConnection {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  remoteStream: MediaStream | null;
  polite: boolean;
}

class WebRTCService {
  private connections: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private onMessageCallbacks: Array<(peerId: string, message: any) => void> = [];
  private onStreamCallbacks: Array<(peerId: string, stream: MediaStream) => void> = [];
  private onConnectionStateChangeCallbacks: Array<(peerId: string, state: RTCPeerConnectionState) => void> = [];

  constructor() {
    this.simulateServer();
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

  // For demo, we'll simulate connection establishment
  simulateServer() {
    console.log('Setting up WebRTC simulation for demo');
  }

  // Connect to a random user (simulated for demo)
  async connectToRandomUser(): Promise<string> {
    return new Promise((resolve) => {
      console.log('Looking for a random user to connect to...');
      
      // Simulate finding a peer
      setTimeout(() => {
        const peerId = `peer-${Math.floor(Math.random() * 10000)}`;
        this.setupPeerConnection(peerId);
        
        // Simulate receiving remote stream after a delay
        setTimeout(() => {
          if (!this.localStream) return;
          
          // Create a new MediaStream for the remote peer (simulated)
          const fakeRemoteStream = new MediaStream();
          
          // Clone tracks from local stream for simulation purposes
          this.localStream.getTracks().forEach(track => {
            fakeRemoteStream.addTrack(track.clone());
          });
          
          const peerConnection = this.connections.get(peerId);
          if (peerConnection) {
            peerConnection.remoteStream = fakeRemoteStream;
            
            // Notify about the new stream
            this.onStreamCallbacks.forEach(callback => {
              callback(peerId, fakeRemoteStream);
            });
            
            // Simulate connection established
            this.onConnectionStateChangeCallbacks.forEach(callback => {
              callback(peerId, 'connected');
            });
          }
        }, 2000);
        
        resolve(peerId);
      }, 3000);
    });
  }

  // Set up a peer connection
  private setupPeerConnection(peerId: string) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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
    
    // Handle ICE candidates (simplified)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        // In a real app, we would send this to the peer via signaling server
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state changed: ${pc.connectionState}`);
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
    
    this.connections.set(peerId, {
      pc,
      dc,
      remoteStream: null,
      polite: true
    });
    
    return { pc, dc };
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
