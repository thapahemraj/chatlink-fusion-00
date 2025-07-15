import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Globe, Clock } from 'lucide-react';
import { UserInfo } from '@/services/signaling';

interface PartnerInfoProps {
  partnerInfo: UserInfo | null;
  isVisible: boolean;
}

export const PartnerInfo: React.FC<PartnerInfoProps> = ({ partnerInfo, isVisible }) => {
  if (!isVisible || !partnerInfo) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card className="absolute top-4 right-4 w-72 bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg z-10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Partner Information</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {partnerInfo.city}, {partnerInfo.region}
              </p>
              <p className="text-xs text-muted-foreground">{partnerInfo.country}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connected at {formatTime(partnerInfo.timestamp)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              IP: {partnerInfo.ip}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};