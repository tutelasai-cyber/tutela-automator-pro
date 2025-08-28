import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { User } from '@supabase/supabase-js';
import { Auth } from "@/components/Auth";
import { Dashboard } from "@/components/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleAuth = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleSignOut = () => {
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                <Dashboard user={user} onSignOut={handleSignOut} />
              ) : (
                <Auth onAuth={handleAuth} />
              )
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
