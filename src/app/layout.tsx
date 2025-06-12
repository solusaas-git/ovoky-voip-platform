import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from '@/lib/AuthContext';
import { BrandingProvider } from '@/lib/BrandingContext';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NotificationPermissionProvider } from '@/components/notifications/NotificationPermissionProvider';
import { Toaster } from '@/components/ui/sonner';

// Dynamic metadata will be handled by individual pages using branding context
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Powerful Communication Management Platform",
  icons: {
    icon: "/favicon.ico", // This will be updated dynamically by BrandingProvider
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <BrandingProvider>
          <AuthProvider>
            <ThemeProvider>
              <NotificationProvider>
                <NotificationPermissionProvider>
              {children}
                </NotificationPermissionProvider>
              <Toaster />
              </NotificationProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
