"use client";

import * as React from "react";
import LoginPage from "./login-page";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Check if we have stored credentials
    const storedAuth = sessionStorage.getItem('auth');
    
    if (storedAuth) {
      // Verify the stored credentials are still valid
      fetch('/api/health', {
        headers: {
          'Authorization': `Basic ${storedAuth}`,
        },
      })
      .then(response => {
        if (response.ok) {
          setIsAuthenticated(true);
          // Set the authorization header for all future requests
          setupGlobalAuth(storedAuth);
        } else {
          sessionStorage.removeItem('auth');
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        sessionStorage.removeItem('auth');
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, []);

  const setupGlobalAuth = (credentials: string) => {
    // Intercept all fetch requests to add authentication
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const headers = new Headers(init?.headers);
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Basic ${credentials}`);
      }
      
      return originalFetch(input, {
        ...init,
        headers,
      });
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-purple-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
