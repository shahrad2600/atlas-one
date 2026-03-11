import type { Metadata } from 'next';
import './globals.css';
import { ClientLayout } from './client-layout';

export const metadata: Metadata = {
  title: 'Atlas One - Partner Dashboard',
  description: 'Partner and admin dashboard for Atlas One travel platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="dark:bg-slate-950 dark:text-slate-100">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
