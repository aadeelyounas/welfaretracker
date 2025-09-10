'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Successful login, redirect to dashboard with full page refresh
        // This ensures middleware gets the cookie
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 100);
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 25%, #8a1b58 75%, #6d1545 100%)'
    }}>
      <div className="w-full max-w-md">
        {/* Logo with Brand Background */}
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 shadow-2xl">
              <img 
                src="/ashridge-logo.png" 
                alt="Ashridge Group" 
                className="h-20 w-auto object-contain filter drop-shadow-lg"
                onError={(e) => { 
                  // Fallback to external logo if local logo fails
                  e.currentTarget.src = "https://ashridge-group-com.nimbus-cdn.uk/wp-content/uploads/2018/10/logo-ash-grp.png";
                }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">Ashridge Group</h1>
          <p className="text-white/80 text-lg drop-shadow-sm">Welfare Tracker System</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl" style={{ color: '#9e1f62' }}>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the welfare tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" style={{ color: '#9e1f62' }}>Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials({ ...credentials, username: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  className="border-2 focus:ring-2"
                  style={{ 
                    borderColor: '#9e1f62',
                    '--tw-ring-color': '#9e1f62'
                  } as any}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: '#9e1f62' }}>Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  required
                  disabled={isLoading}
                  className="border-2 focus:ring-2"
                  style={{ 
                    borderColor: '#9e1f62',
                    '--tw-ring-color': '#9e1f62'
                  } as any}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                style={{ 
                  background: 'linear-gradient(135deg, #9e1f62 0%, #b02470 100%)'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-white/80">
          <p>Authorized personnel only</p>
          <p className="mt-1">© 2025 Ashridge Group</p>
        </div>
      </div>
    </div>
  );
}
