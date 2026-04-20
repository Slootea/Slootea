"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth, UserButton, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { setAuthToken, setOrganizationContext, organizationsApi } from "@/lib/api";
import { trackSignIn } from "@/lib/analytics";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { PageHeaderProvider, usePageHeader } from "@/components/providers/page-header-provider";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";

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
  const { currentOrganization, isAdmin, isLoading: orgLoading } = useOrganizationContext();
  
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const hasTrackedSignIn = useRef(false);

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
        
        // Track sign-in (only once per session)
        if (!hasTrackedSignIn.current && user?.id) {
          hasTrackedSignIn.current = true;
          trackSignIn(user.id, {
            organization_id: currentOrganization?.id,
            organization_name: currentOrganization?.name,
          });
        }
      }
    };
    setupAuth();
  }, [isSignedIn, getToken, user?.id, currentOrganization]);

  // Check onboarding status for org admins
  const checkOnboardingStatus = useCallback(async () => {
    if (!currentOrganization || !isAdmin || orgLoading) return;

    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const response = await organizationsApi.getOnboardingStatus(currentOrganization.id);
      
      if (!response.data.onboarded) {
        // Not onboarded, redirect to onboarding
        router.replace("/onboarding");
        return;
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    } finally {
      setOnboardingChecked(true);
    }
  }, [currentOrganization, isAdmin, orgLoading, getToken, router]);

  useEffect(() => {
    if (isSignedIn && currentOrganization && isAdmin && !orgLoading) {
      checkOnboardingStatus();
    } else if (isSignedIn && (!isAdmin || !currentOrganization)) {
      // Non-admin users or no org selected - skip onboarding check
      setOnboardingChecked(true);
    }
  }, [isSignedIn, currentOrganization, isAdmin, orgLoading, checkOnboardingStatus]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show loading while checking onboarding status for admins
  if (isAdmin && currentOrganization && !onboardingChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PageHeaderProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader navItems={navItems} pathname={pathname} defaultTitle={t("dashboard")} />
          {/* Page content with breathing room */}
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </PageHeaderProvider>
  );
}

function DashboardHeader({ 
  navItems, 
  pathname, 
  defaultTitle 
}: { 
  navItems: { href: string; label: string }[];
  pathname: string;
  defaultTitle: string;
}) {
  const { header } = usePageHeader();
  
  // Use page header from context, or fallback to nav item label
  const title = header?.title || navItems.find((item) => item.href === pathname)?.label || defaultTitle;
  const subtitle = header?.subtitle;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-6 sticky top-0 z-50 glass">
      <SidebarTrigger className="-ml-1" />
      <div className="h-6 w-px bg-surface-variant/50" />
      <div className="flex flex-col justify-center">
        <h1 className="text-lg font-display font-semibold tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground leading-tight">{subtitle}</p>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <NotificationsDropdown />
        <UserButton 
          afterSignOutUrl="/" 
          showName
          appearance={{
            elements: {
              userButtonTrigger: "flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 hover:bg-surface-container transition-colors",
              userButtonBox: "flex-row-reverse",
              userButtonOuterIdentifier: "text-sm font-medium text-foreground",
              avatarBox: "h-7 w-7",
            }
          }}
        />
      </div>
    </header>
  );
}
