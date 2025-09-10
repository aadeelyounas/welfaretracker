import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';

export const metadata: Metadata = {
  title: 'Ashridge Group - Welfare Tracker',
  description: 'Employee welfare tracking system by Ashridge Group.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,701&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="min-h-screen flex flex-col">
          <main className="flex-1 p-4">
            {children}
          </main>
          <footer className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src="https://ashridge-group-com.nimbus-cdn.uk/wp-content/uploads/2018/10/logo-ash-grp.png"
                  alt="Ashridge Group"
                  className="h-8 w-auto brightness-0 invert"
                />
                <span className="text-sm font-medium">Ashridge Group</span>
              </div>
              <div className="text-xs text-purple-100 text-center sm:text-right">
                <p>Employee Welfare Management System</p>
                <p>© {new Date().getFullYear()} Ashridge Group. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
