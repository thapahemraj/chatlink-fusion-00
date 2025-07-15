
import { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface VisitorData {
  ip: string;
  timestamp: number;
  country: string;
}

export const VisitorCounter = () => {
  const [visitorCount, setVisitorCount] = useState(0);
  const [currentUserIP, setCurrentUserIP] = useState<string | null>(null);
  
  useEffect(() => {
    const trackVisitor = async () => {
      try {
        // Get current user's IP
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const userIP = data.ip;
        setCurrentUserIP(userIP);
        
        // Get existing visitors from localStorage
        const storedVisitors = localStorage.getItem('unique-visitors');
        const visitors: VisitorData[] = storedVisitors ? JSON.parse(storedVisitors) : [];
        
        // Clean old visitors (older than 24 hours)
        const now = Date.now();
        const activeVisitors = visitors.filter(visitor => 
          now - visitor.timestamp < 24 * 60 * 60 * 1000
        );
        
        // Check if current IP is already tracked
        const existingVisitor = activeVisitors.find(visitor => visitor.ip === userIP);
        
        if (!existingVisitor) {
          // Add new visitor
          const newVisitor: VisitorData = {
            ip: userIP,
            timestamp: now,
            country: data.country_name || 'Unknown'
          };
          activeVisitors.push(newVisitor);
          
          // Save updated visitors list
          localStorage.setItem('unique-visitors', JSON.stringify(activeVisitors));
          console.log('New unique visitor tracked:', userIP);
        }
        
        // Set count (excluding current user)
        const otherVisitors = activeVisitors.filter(visitor => visitor.ip !== userIP);
        setVisitorCount(otherVisitors.length);
        
      } catch (error) {
        console.error('Failed to track visitor:', error);
        setVisitorCount(0);
      }
    };
    
    trackVisitor();
  }, []);
  
  return (
    <div className="flex items-center gap-1.5">
      <Users size={16} className="text-muted-foreground" />
      <Badge variant="secondary" className="text-xs font-medium">
        {visitorCount} visitor{visitorCount !== 1 ? 's' : ''}
      </Badge>
    </div>
  );
};
