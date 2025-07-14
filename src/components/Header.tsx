
import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
  showLogout?: boolean;
  onLogout?: () => void;
}

const Header = ({ className, showLogout = false, onLogout }: HeaderProps) => {
  return (
    <header className={cn(
      "w-full glass-panel py-4 px-6 flex items-center justify-between",
      className
    )}>
      <Link to="/" className="transition-opacity hover:opacity-80">
        <Logo />
      </Link>
      
      {showLogout && onLogout && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground" 
          onClick={onLogout}
        >
          <LogOut size={16} className="mr-2" />
          <span>Log out</span>
        </Button>
      )}
    </header>
  );
};

export default Header;
