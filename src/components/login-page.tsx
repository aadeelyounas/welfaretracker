"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Create Basic Auth header
      const credentials = btoa(`${username}:${password}`);
      
      // Make a request to test authentication
      const response = await fetch('/api/health', {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (response.ok) {
        // Store credentials in session storage for this session
        sessionStorage.setItem('auth', credentials);
        // Reload the page to trigger middleware with stored credentials
        window.location.reload();
      } else {
        setError("Invalid username or password. Please try again.");
      }
    } catch (error) {
      setError("Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, rgba(158, 31, 98, 0.05) 0%, rgba(176, 36, 112, 0.08) 50%, rgba(138, 27, 88, 0.03) 100%)' }}>
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2" style={{ borderColor: '#9e1f62' }}>
        <CardHeader className="text-center text-white rounded-t-lg" style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 50%, #8a1b58 100%)' }}>
          <div className="mx-auto bg-white/20 rounded-full p-3 w-fit mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Employee Welfare Tracker</CardTitle>
          <CardDescription className="text-white/80">
            Secure login for Ashridge Group personnel
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username" style={{ color: '#9e1f62' }}>Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border focus:border" 
                style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: '#9e1f62' }}>Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border focus:border" 
                  style={{ borderColor: '#9e1f62', '--tw-ring-color': '#9e1f62' } as any}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-500" /> : <Eye className="h-5 w-5 text-gray-500" />}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full text-white font-bold py-3 text-base" 
              disabled={isLoading}
              style={{ background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)' }}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
