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

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/options", label: "Service Options" },
  { href: "/dashboard/availability", label: "Availability" },
  { href: "/dashboard/blocks", label: "Blocked Times" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/links", label: "Booking Links" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-xl font-semibold">
            {navItems.find((item) => item.href === pathname)?.label || "Dashboard"}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user?.firstName || user?.username || user?.emailAddresses[0]?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
