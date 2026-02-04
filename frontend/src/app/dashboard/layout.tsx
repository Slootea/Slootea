"use client";

import { useEffect } from "react";
import { useAuth, UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { setAuthToken } from "@/lib/api";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("sidebar");
  const tLayout = useTranslations("layoutPage");

  const navItems = [
    { href: "/dashboard", label: tLayout("overview") },
    { href: "/dashboard/calendar", label: t("calendar") },
    { href: "/dashboard/options", label: t("serviceOptions") },
    { href: "/dashboard/availability", label: t("availability") },
    { href: "/dashboard/appointments", label: t("appointments") },
    { href: "/dashboard/links", label: t("bookingLinks") },
    { href: "/dashboard/reports", label: t("reports") || "Reports" },
    { href: "/dashboard/settings", label: t("settings") },
  ];

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const setupAuth = async () => {
      if (isSignedIn) {
        const token = await getToken();
        setAuthToken(token);
      }
    };
    setupAuth();
  }, [isSignedIn, getToken]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-50 bg-background">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-xl font-semibold">
            {navItems.find((item) => item.href === pathname)?.label || t("dashboard")}
          </h1>
          <div className="ml-auto">
            <UserButton 
              afterSignOutUrl="/" 
              showName
              appearance={{
                elements: {
                  userButtonTrigger: "flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 hover:bg-[var(--muted)] transition-colors",
                  userButtonBox: "flex-row-reverse",
                  userButtonOuterIdentifier: "text-sm font-medium text-[var(--foreground)]",
                  avatarBox: "h-6 w-6",
                }
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
