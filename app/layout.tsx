import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from './contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Pemabu MFO — Modern Family Office',
  description: 'Risk parity scenario lab and ETF signal ranking engine for family offices.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-neutral-950 text-neutral-50 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
