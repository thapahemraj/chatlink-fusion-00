
import { VisitorCounter } from "@/components/VisitorCounter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Check authentication status and redirect if needed
  const handleStartChat = () => {
    if (isAuthenticated) {
      navigate("/chat");
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-800">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">ChatLink</CardTitle>
          <CardDescription>Connect with random people through video chat</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <p className="text-center text-muted-foreground">
            Start a video chat with random people around the world. Talk, share, and connect.
          </p>
          <Button 
            size="lg" 
            className="w-full transition-all duration-300 hover:scale-105"
            onClick={handleStartChat}
          >
            Start Chatting
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center pt-2 pb-6">
          <VisitorCounter />
        </CardFooter>
      </Card>
    </div>
  );
};

export default Index;
