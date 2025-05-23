import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Home from "@/pages/home";
import Submit from "@/pages/submit";
import Archive from "@/pages/archive";
import Admin from "@/pages/admin";
import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/submit" component={Submit} />
      <Route path="/archive" component={Archive} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  
  // WebSocketのリアルタイム接続を設定
  const { isConnected } = useWebSocket();

  useEffect(() => {
    // WebSocket接続状態をコンソールに表示（開発用）
    console.log('WebSocket connection status:', isConnected);
  }, [isConnected]);

  useEffect(() => {
    // Create a simple fingerprint using a random ID that persists in localStorage
    const storedFingerprint = localStorage.getItem("fingerprint");
    if (storedFingerprint) {
      setFingerprint(storedFingerprint);
    } else {
      const newFingerprint = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
      localStorage.setItem("fingerprint", newFingerprint);
      setFingerprint(newFingerprint);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-grow">
            {fingerprint && (
              <Router />
            )}
          </main>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
