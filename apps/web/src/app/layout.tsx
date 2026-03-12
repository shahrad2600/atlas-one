import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import Nav from '@/components/nav';
import Footer from '@/components/footer';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Atlas One',
    template: '%s | Atlas One',
  },
  description:
    'Your AI-powered travel operating system. Discover hotels, flights, restaurants, experiences, and more.',
  openGraph: {
    title: 'Atlas One',
    description:
      'Your AI-powered travel operating system. Discover hotels, flights, restaurants, experiences, and more.',
    siteName: 'Atlas One',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atlas One',
    description:
      'Your AI-powered travel operating system. Discover hotels, flights, restaurants, experiences, and more.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col transition-colors duration-300">
        <ThemeProvider>
          <AuthProvider>
            <Nav />
            <main className="flex-1 pt-16">{children}</main>
            <Footer />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: '#FFFFFF',
                  color: '#1A1A1A',
                  border: '1px solid rgba(184, 148, 95, 0.12)',
                  boxShadow:
                    '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.03)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#f43f5e',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
