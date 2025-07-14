
import React from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, SkipForward, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoControlsProps {
  className?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isChatOpen: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleChat: () => void;
  onSkip: () => void;
  onEnd: () => void;
}

const VideoControls = ({
  className,
  isMuted,
  isVideoEnabled,
  isChatOpen,
  onToggleMute,
  onToggleVideo,
  onToggleChat,
  onSkip,
  onEnd
}: VideoControlsProps) => {
  return (
    <div className={cn(
      "flex items-center justify-center gap-2 p-3 glass-panel rounded-full animate-fade-in",
      className
    )}>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "rounded-full w-10 h-10 border-0",
          isMuted ? "bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700" : "bg-secondary"
        )}
        onClick={onToggleMute}
      >
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "rounded-full w-10 h-10 border-0",
          !isVideoEnabled ? "bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700" : "bg-secondary"
        )}
        onClick={onToggleVideo}
      >
        {!isVideoEnabled ? <VideoOff size={18} /> : <Video size={18} />}
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "rounded-full w-10 h-10 border-0",
          isChatOpen ? "bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700" : "bg-secondary"
        )}
        onClick={onToggleChat}
      >
        <MessageSquare size={18} />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="rounded-full w-10 h-10 border-0 bg-secondary"
        onClick={onSkip}
      >
        <SkipForward size={18} />
      </Button>
      
      <Button
        variant="destructive"
        size="icon"
        className="rounded-full w-10 h-10"
        onClick={onEnd}
      >
        <X size={18} />
      </Button>
    </div>
  );
};

export default VideoControls;
