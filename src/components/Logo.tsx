
import React from 'react';
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ className, size = 'md' }: LogoProps) => {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn("font-display font-semibold", sizeClasses[size], className)}>
      <span className="text-primary">Chat</span>
      <span>Link</span>
    </div>
  );
};

export default Logo;
