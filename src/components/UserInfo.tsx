import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Globe, Clock, Users } from 'lucide-react';

export interface UserData {
  id: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  timestamp: number;
  userAgent: string;
}

interface UserInfoProps {
  className?: string;
}

export const UserInfo: React.FC<UserInfoProps> = ({ className }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('chatlink-user');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Check if user is authenticated
        const authUser = localStorage.getItem('chatlink-user');
        if (!authUser) {
          setLoading(false);
          return;
        }

        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const userInfo: UserData = {
          id: generateUserId(),
          ip: data.ip || 'Unknown',
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          region: data.region || 'Unknown',
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        };
        
        setUserData(userInfo);
        
        // Save to localStorage
        localStorage.setItem('currentUser', JSON.stringify(userInfo));
        
        // Update online users count
        updateOnlineUsersCount(userInfo);
        
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Only create fallback if user is authenticated
        const authUser = localStorage.getItem('chatlink-user');
        if (authUser) {
          const fallbackData: UserData = {
            id: generateUserId(),
            ip: 'Unable to detect',
            country: 'Unknown',
            city: 'Unknown',
            region: 'Unknown',
            timestamp: Date.now(),
            userAgent: navigator.userAgent
          };
          setUserData(fallbackData);
          localStorage.setItem('currentUser', JSON.stringify(fallbackData));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const generateUserId = (): string => {
    return `user-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
  };

  const updateOnlineUsersCount = (currentUser: UserData) => {
    try {
      const existingUsers = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
      const now = Date.now();
      const thirtyMinutesAgo = now - (30 * 60 * 1000); // 30 minutes

      // Filter out users older than 30 minutes and current user
      const activeUsers = existingUsers.filter((user: UserData) => 
        user.timestamp > thirtyMinutesAgo && user.ip !== currentUser.ip
      );

      // Add current user
      activeUsers.push(currentUser);

      // Save updated list
      localStorage.setItem('onlineUsers', JSON.stringify(activeUsers));
      
      // Set count (excluding current user for display)
      setOnlineUsers(activeUsers.length - 1);
    } catch (error) {
      console.error('Error updating online users:', error);
      setOnlineUsers(0);
    }
  };

  // Don't render if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userData) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Your Information</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {userData.city}, {userData.region}
              </p>
              <p className="text-xs text-muted-foreground">{userData.country}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connected at {formatTime(userData.timestamp)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {onlineUsers} other user{onlineUsers !== 1 ? 's' : ''} online
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              IP: {userData.ip}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Export user data getter for other components
export const getCurrentUserData = (): UserData | null => {
  try {
    const data = localStorage.getItem('currentUser');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const getOnlineUsersCount = (): number => {
  try {
    // Only count authenticated users
    const authUser = localStorage.getItem('chatlink-user');
    if (!authUser) return 0;
    
    const users = JSON.parse(localStorage.getItem('onlineUsers') || '[]');
    const currentUser = getCurrentUserData();
    const now = Date.now();
    const thirtyMinutesAgo = now - (30 * 60 * 1000);
    
    const activeUsers = users.filter((user: UserData) => 
      user.timestamp > thirtyMinutesAgo && user.ip !== currentUser?.ip
    );
    
    return activeUsers.length;
  } catch {
    return 0;
  }
};