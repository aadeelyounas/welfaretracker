'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const handleLogout = async () => {
    try {
      // Call the logout API endpoint
      await fetch('/api/auth', {
        method: 'DELETE',
      });
      
      // Reload the page to trigger the authentication middleware
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the API call fails, try to remove the cookie and reload
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      window.location.reload();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      className="flex items-center gap-2 bg-white/20 border-white/30 text-white hover:bg-white/30 hover:border-white/50 font-medium backdrop-blur-sm"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  );
}
