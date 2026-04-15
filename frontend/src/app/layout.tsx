import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { OrganizationProvider } from "@/components/providers/organization-provider";
import { ModuleProvider } from "@/components/providers/module-provider";
import { ActivityTracker } from "@/components/activity-tracker";
import { Toaster } from "@/components/ui/toaster";
import { GoogleAnalytics } from '@next/third-parties/google'

import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Slootea - Service Business Management Software",
    template: "%s | Slootea",
  },
  description: "The superior toolbox for service businesses. Manage appointments, inventory, and client relationships with elite precision.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://slootea.com'),
  applicationName: 'Slootea',
  icons: {
    icon: '/Slootea_logo.png',
    apple: '/Slootea_logo.png',
  },
  manifest: '/manifest.json',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale} suppressHydrationWarning>
        <body className={`${inter.variable} ${manrope.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NextIntlClientProvider messages={messages}>
              <LocaleProvider>
                <AuthProvider>
                  <OrganizationProvider>
                    <ModuleProvider>
                      <ActivityTracker />
                      {children}
                    </ModuleProvider>
                  </OrganizationProvider>
                </AuthProvider>
              </LocaleProvider>
            </NextIntlClientProvider>
            <Toaster />
          </ThemeProvider>
          <GoogleAnalytics gaId="G-8KB1ZXW003" />
        </body>
        
      </html>
    </ClerkProvider>
  );
}
