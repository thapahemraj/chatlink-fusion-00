
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import AuthForm from '@/components/AuthForm';
import { VisitorCounter } from '@/components/VisitorCounter';

const Home = () => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full flex flex-col items-center text-center mb-8 animate-slide-down">
          <div className="mb-2">
            <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium">
              Connect instantly
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-3">
            Meet new people through video chat
          </h1>
          
          <p className="text-muted-foreground text-lg max-w-sm">
            Instant video connections with random people worldwide. No sign-up required.
          </p>
        </div>
        
        <AuthForm />
        
        <div className="mt-12 text-center text-sm text-muted-foreground animate-fade-in delay-200">
          <p>By continuing, you agree to our Terms and Privacy Policy.</p>
        </div>
        
        <div className="mt-8 flex justify-center animate-fade-in delay-300">
          <VisitorCounter />
        </div>
      </main>
    </div>
  );
};

export default Home;
