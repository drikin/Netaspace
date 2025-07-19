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
import Extension from "@/pages/extension";
import { useEffect, useState } from "react";

import KeyboardShortcutsDialog from "@/components/keyboard-shortcuts-dialog";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/submit" component={Submit} />
      <Route path="/extension" component={Extension} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

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

  // Keyboard shortcut for showing help (? key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if ? key is pressed (Shift + / on most keyboards) and no input is focused
      if (
        event.key === '?' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.role !== 'textbox'
      ) {
        event.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-grow">
            <Router />
          </main>
          <Footer />
          {/* キーボードショートカットヘルプダイアログ */}
          <KeyboardShortcutsDialog 
            open={showKeyboardShortcuts} 
            onOpenChange={setShowKeyboardShortcuts} 
          />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
