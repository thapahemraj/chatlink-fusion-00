
import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  sender: 'me' | 'stranger';
  text: string;
  timestamp: Date;
}

interface ChatBoxProps {
  className?: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
}

const ChatBox = ({ className, messages, onSendMessage }: ChatBoxProps) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className={cn(
      "flex flex-col h-full",
      className
    )}>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id}
              className={cn(
                "max-w-[80%] p-3 rounded-xl animate-scale-in",
                message.sender === 'me' 
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-none" 
                  : "mr-auto glass-panel-subtle rounded-bl-none"
              )}
            >
              <p className="text-sm">{message.text}</p>
              <span className="text-xs opacity-70 block mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="rounded-full"
        />
        <Button 
          type="submit" 
          size="icon" 
          className="rounded-full"
          disabled={!newMessage.trim()}
        >
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default ChatBox;
