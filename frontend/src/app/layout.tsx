import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { OrganizationProvider } from "@/components/providers/organization-provider";
import { Toaster } from "@/components/ui/toaster";
import { GoogleAnalytics } from '@next/third-parties/google'

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Appointment Slot Recovery",
  description: "Recover empty appointment slots and reduce no-shows",
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
        <body className={inter.className}>
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
                    {children}
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
