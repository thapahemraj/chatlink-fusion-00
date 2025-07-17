import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import VideoContainer from '@/components/VideoContainer';
import VideoControls from '@/components/VideoControls';
import ChatBox, { Message } from '@/components/ChatBox';
import ConnectingOverlay from '@/components/ConnectingOverlay';
import ConnectionStatus from '@/components/ConnectionStatus';
import { PartnerInfo } from '@/components/PartnerInfo';
import webRTCService from '@/services/webrtc';

const Chat = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting to home");
    return <Navigate to="/home" replace />;
  }
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentPeerId, setCurrentPeerId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [connectionInfo, setConnectionInfo] = useState<Array<{
    peerId: string;
    connectionState: RTCPeerConnectionState;
    localIP?: string;
    remoteIP?: string;
  }>>([]);
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [showPartnerInfo, setShowPartnerInfo] = useState(false);
  
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await webRTCService.getLocalStream();
        setLocalStream(stream);
        console.log('Local stream obtained:', stream.id);
        findNewPeer();
      } catch (error) {
        console.error('Failed to get local stream:', error);
        toast({
          title: "Camera access error",
          description: "Please allow camera and microphone access to use this app.",
          variant: "destructive",
        });
      }
    };
    
    init();
    
    const unsubscribeMessage = webRTCService.onMessage((peerId, data) => {
      if (data.type === 'chat') {
        const newMessage: Message = {
          id: uuidv4(),
          sender: 'stranger',
          text: data.text,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
      }
    });
    
    const unsubscribeStream = webRTCService.onStream((peerId, stream) => {
      console.log('Remote stream received:', stream.id);
      setRemoteStream(stream);
      setConnecting(false);
      
      toast({
        title: "Connected!",
        description: "You're now chatting with a stranger.",
      });
    });
    
    const unsubscribeConnectionState = webRTCService.onConnectionStateChange((peerId, state) => {
      console.log(`Connection state with ${peerId}: ${state}`);
      
      // Update connection info
      setConnectionInfo(prev => {
        const existing = prev.find(conn => conn.peerId === peerId);
        if (existing) {
          return prev.map(conn => 
            conn.peerId === peerId 
              ? { ...conn, connectionState: state }
              : conn
          );
        } else {
          return [...prev, { peerId, connectionState: state }];
        }
      });
      
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setRemoteStream(null);
        setCurrentPeerId(null);
        setMessages([]);
        setConnectionInfo(prev => prev.filter(conn => conn.peerId !== peerId));
        
        toast({
          title: "Disconnected",
          description: "The other person has left the chat.",
        });
      }
    });
    
    return () => {
      webRTCService.cleanup();
      unsubscribeMessage();
      unsubscribeStream();
      unsubscribeConnectionState();
    };
  }, [toast]);
  
  const findNewPeer = useCallback(async () => {
    if (currentPeerId) {
      webRTCService.disconnectFromPeer(currentPeerId);
    }
    
    setRemoteStream(null);
    setCurrentPeerId(null);
    setMessages([]);
    setConnecting(true);
    setConnectionStatus('Looking for a partner...');
    setPartnerInfo(null);
    setShowPartnerInfo(false);
    
    try {
      const peerId = await webRTCService.connectToRandomUser();
      
      if (peerId) {
        setCurrentPeerId(peerId);
        setConnectionStatus('Establishing connection...');
        
        const stream = webRTCService.getRemoteStream(peerId);
        if (stream) {
          setRemoteStream(stream);
          setConnecting(false);
        }
      } else {
        setConnectionStatus('Partner not available. Join after a few minutes.');
        setConnecting(false);
        // Retry after 30 seconds
        setTimeout(findNewPeer, 30000);
      }
    } catch (error) {
      console.error('Error connecting to peer:', error);
      setConnectionStatus('Connection failed. Retrying...');
      
      setTimeout(findNewPeer, 3000);
    }
  }, [currentPeerId]);
  
  const handleSendMessage = useCallback((text: string) => {
    if (!currentPeerId) return;
    
    const newMessage: Message = {
      id: uuidv4(),
      sender: 'me',
      text,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    webRTCService.sendMessage(currentPeerId, {
      type: 'chat',
      text,
    });
  }, [currentPeerId]);
  
  const handleToggleMute = useCallback(() => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    webRTCService.toggleAudio(!newMuteState);
  }, [isMuted]);
  
  const handleToggleVideo = useCallback(() => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);
    webRTCService.toggleVideo(newVideoState);
  }, [isVideoEnabled]);
  
  const handleSkip = useCallback(() => {
    toast({
      title: "Finding new partner",
      description: "Looking for someone new to chat with...",
    });
    findNewPeer();
  }, [findNewPeer, toast]);
  
  const handleEndChat = useCallback(() => {
    webRTCService.cleanup();
    navigate('/');
  }, [navigate]);
  
  const handleLogout = useCallback(() => {
    webRTCService.cleanup();
    logout();
    navigate('/');
  }, [logout, navigate]);
  
  return (
    <div className="min-h-screen flex flex-col bg-secondary/40">
      <Header showLogout onLogout={logout} />
      
      <main className="flex-1 p-4 flex flex-col lg:p-6">
        <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col md:flex-row gap-4 relative">
          <div className="flex-1 relative glass-panel rounded-xl overflow-hidden flex flex-col">
            <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm animate-fade-in">
              {user?.username}
            </div>
            
            <div className="flex-1 relative">
              {remoteStream ? (
                <VideoContainer stream={remoteStream} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-muted-foreground">Waiting for partner...</p>
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden shadow-elevated z-10 animate-scale-in">
                <VideoContainer stream={localStream} muted />
              </div>
            </div>
            
            <div className="p-4 flex justify-center">
              <VideoControls 
                isMuted={isMuted}
                isVideoEnabled={isVideoEnabled}
                isChatOpen={isChatOpen}
                onToggleMute={handleToggleMute}
                onToggleVideo={handleToggleVideo}
                onToggleChat={() => setIsChatOpen(!isChatOpen)}
                onSkip={handleSkip}
                onEnd={handleEndChat}
              />
            </div>
            
            <ConnectingOverlay 
              isVisible={connecting} 
              status={connectionStatus} 
            />
            
            <PartnerInfo 
              partnerInfo={partnerInfo}
              isVisible={showPartnerInfo && !connecting}
            />
          </div>
          
          <div className="w-full md:w-80 space-y-4">
            <ConnectionStatus 
              connections={connectionInfo}
              isConnecting={connecting}
            />
            
            <div 
              className={`
                glass-panel rounded-xl overflow-hidden transition-all duration-300 ease-in-out
                ${isChatOpen ? 'h-96 md:h-auto opacity-100' : 'h-0 md:h-auto md:opacity-100 opacity-0 overflow-hidden'}
              `}
            >
              {isChatOpen || window.innerWidth >= 768 ? (
                <ChatBox 
                  messages={messages}
                  onSendMessage={handleSendMessage}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
