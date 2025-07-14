
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';

interface AuthFormProps {
  className?: string;
}

const AuthForm = ({ className }: AuthFormProps) => {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to continue",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Use the login function from AuthContext
    login(username.trim());
    
    // Show success toast
    toast({
      title: "Welcome!",
      description: `You're logged in as ${username}`,
    });
    
    // Redirect to chat page after a brief delay
    setTimeout(() => {
      navigate('/chat');
    }, 800);
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn(
        "space-y-4 w-full max-w-sm animate-slide-up",
        className
      )}
    >
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="Enter a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="h-12 px-4 text-base"
          disabled={isSubmitting}
          autoFocus
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full h-12 text-base font-medium"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Getting ready...' : 'Enter ChatLink'}
      </Button>
    </form>
  );
};

export default AuthForm;
