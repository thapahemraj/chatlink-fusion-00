import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, RefreshCw } from 'lucide-react';
import { realTimeSignalingService } from '@/services/realTimeSignaling';
import { getOnlineUsersCount } from './UserInfo';

interface PartnerAvailabilityProps {
  onPartnerFound?: () => void;
  className?: string;
}

export const PartnerAvailability: React.FC<PartnerAvailabilityProps> = ({ 
  onPartnerFound, 
  className 
}) => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchTime, setLastSearchTime] = useState<number | null>(null);
  const [nextSearchIn, setNextSearchIn] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setOnlineCount(getOnlineUsersCount());
    };

    updateCount();
    const interval = setInterval(updateCount, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (nextSearchIn > 0) {
      timer = setTimeout(() => {
        setNextSearchIn(prev => prev - 1);
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [nextSearchIn]);

  const handleSearchForPartner = async () => {
    setIsSearching(true);
    setLastSearchTime(Date.now());
    
    try {
      const partner = await realTimeSignalingService.findPartner();
      
      if (partner) {
        onPartnerFound?.();
      } else {
        // Set cooldown for next search (30 seconds)
        setNextSearchIn(30);
      }
    } catch (error) {
      console.error('Error searching for partner:', error);
      setNextSearchIn(15); // Shorter cooldown on error
    } finally {
      setIsSearching(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const canSearchAgain = nextSearchIn === 0 && !isSearching;

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Partner Status</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${onlineCount > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <p className="text-sm text-muted-foreground">
                {onlineCount} user{onlineCount !== 1 ? 's' : ''} online
              </p>
            </div>

            {onlineCount === 0 ? (
              <div className="text-center py-4">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-foreground font-medium mb-1">
                  Partner not available
                </p>
                <p className="text-sm text-muted-foreground">
                  Join after a few minutes when more users are online
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  {onlineCount} partner{onlineCount !== 1 ? 's' : ''} available for chat
                </p>
                
                <Button 
                  onClick={handleSearchForPartner}
                  disabled={!canSearchAgain}
                  className="w-full"
                  variant={canSearchAgain ? "default" : "secondary"}
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : nextSearchIn > 0 ? (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      Search again in {formatTime(nextSearchIn)}
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Find Partner
                    </>
                  )}
                </Button>
              </div>
            )}

            {lastSearchTime && (
              <p className="text-xs text-muted-foreground">
                Last search: {new Date(lastSearchTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};