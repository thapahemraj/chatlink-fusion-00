
import React from 'react';
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectingOverlayProps {
  className?: string;
  isVisible: boolean;
  status?: string;
}

const ConnectingOverlay = ({ className, isVisible, status = "Connecting..." }: ConnectingOverlayProps) => {
  if (!isVisible) return null;
  
  return (
    <div className={cn(
      "absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in",
      className
    )}>
      <Loader2 className="h-12 w-12 text-primary animate-spin-slow" />
      <div className="mt-4 text-center">
        <h3 className="text-xl font-medium">{status}</h3>
        <p className="text-muted-foreground mt-1">Looking for someone to chat with...</p>
      </div>
    </div>
  );
};

export default ConnectingOverlay;
