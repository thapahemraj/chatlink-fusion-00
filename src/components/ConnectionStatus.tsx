import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, Globe, Users } from 'lucide-react';

interface ConnectionInfo {
  peerId: string;
  connectionState: RTCPeerConnectionState;
  localIP?: string;
  remoteIP?: string;
  candidateType?: string;
}

interface ConnectionStatusProps {
  connections: ConnectionInfo[];
  isConnecting: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connections, isConnecting }) => {
  const [localIP, setLocalIP] = useState<string>('');

  useEffect(() => {
    // Get local IP address
    const getLocalIP = async () => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        
        pc.createDataChannel('');
        
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const regex = /(\d+\.\d+\.\d+\.\d+)/;
            const match = candidate.match(regex);
            if (match) {
              setLocalIP(match[1]);
              pc.close();
            }
          }
        };
        
        await pc.createOffer();
      } catch (error) {
        console.error('Error getting local IP:', error);
      }
    };

    getLocalIP();
  }, []);

  const getConnectionIcon = (state: RTCPeerConnectionState) => {
    switch (state) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-primary" />;
      case 'connecting':
        return <Wifi className="w-4 h-4 text-muted-foreground animate-pulse" />;
      default:
        return <WifiOff className="w-4 h-4 text-destructive" />;
    }
  };

  const getConnectionBadge = (state: RTCPeerConnectionState) => {
    switch (state) {
      case 'connected':
        return <Badge variant="default" className="bg-primary">Connected</Badge>;
      case 'connecting':
        return <Badge variant="secondary">Connecting...</Badge>;
      case 'disconnected':
        return <Badge variant="destructive">Disconnected</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Local IP */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Your IP:</span>
          <code className="px-2 py-1 bg-muted rounded text-foreground">
            {localIP || 'Detecting...'}
          </code>
        </div>

        {/* Connection Loading State */}
        {isConnecting && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
            Looking for peers...
          </div>
        )}

        {/* Active Connections */}
        {connections.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Users className="w-3 h-3" />
              Active Connections ({connections.length})
            </div>
            {connections.map((connection) => (
              <div key={connection.peerId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getConnectionIcon(connection.connectionState)}
                  <div className="text-xs">
                    <div className="font-medium">
                      {connection.peerId.slice(0, 8)}...
                    </div>
                    {connection.remoteIP && (
                      <div className="text-muted-foreground">
                        {connection.remoteIP}
                      </div>
                    )}
                  </div>
                </div>
                {getConnectionBadge(connection.connectionState)}
              </div>
            ))}
          </div>
        )}

        {/* No Connections */}
        {!isConnecting && connections.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-2">
            No active connections
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatus;