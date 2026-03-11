import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import Sidebar from '@/components/sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atlas One - Concierge Console',
  description: 'Concierge management console for Atlas One',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="dark:bg-slate-950">
        <AuthProvider>
          <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
