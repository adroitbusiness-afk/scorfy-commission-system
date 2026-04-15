import './globals.css';
import ApplicationCta from './ApplicationCta';

export const metadata = {
  title: 'Scorfy Commission System',
  description: 'Smart Recruitment Dashboard',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ApplicationCta />
        {children}
      </body>
    </html>
  );
}