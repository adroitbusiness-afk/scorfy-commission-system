import './globals.css';
import { Metadata } from 'next';
import ApplicationCta from './ApplicationCta';
import OnlineStatusProvider from '@/components/OnlineStatusProvider';
import { Toaster } from 'react-hot-toast';
// ... inside body
<Toaster position="top-right" />

export const metadata: Metadata = {
  title: 'Scorfy Commission System',
  description: 'Smart Recruitment Dashboard',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OnlineStatusProvider />
        <ApplicationCta />
        {children}
      </body>
    </html>
  );
}