import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { SyncManager } from '@/components/sync-manager';

export const metadata: Metadata = {
  title: 'Sen Lab Visa',
  description: 'Laboratoires virtuels STEM pour les élèves sénégalais',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Sen Lab Visa', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.svg', apple: '/icon-192.svg' },
};

export const viewport: Viewport = {
  themeColor: '#8B5CF6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <SyncManager />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
