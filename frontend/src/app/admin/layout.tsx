"use client";

import { useEffect, useState } from "react";
import { useAuth, UserButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/lib/api";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Separator } from "@/components/ui/separator";
import { Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [authReady, setAuthReady] = useState(false);

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
        setAuthReady(true);
      }
    };
    setupAuth();
  }, [isSignedIn, getToken]);

  // Check if user is system admin
  useEffect(() => {
    if (user) {
      const publicMetadata = user.publicMetadata as { role?: string } | undefined;
      const role = publicMetadata?.role;
      setIsAdmin(role === "admin");
      setIsChecking(false);
    }
  }, [user]);

  if (!isLoaded || !isSignedIn || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have system administrator privileges. This area is restricted to authorized administrators only.
            <br />
            <br />
            <Link href="/dashboard" className="underline hover:no-underline">
              Return to Dashboard
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-50 bg-background">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Admin Portal</h1>
          </div>
          <div className="ml-auto">
            <UserButton
              afterSignOutUrl="/"
              showName
              appearance={{
                elements: {
                  userButtonTrigger:
                    "flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 hover:bg-[var(--muted)] transition-colors",
                  userButtonBox: "flex-row-reverse",
                  userButtonOuterIdentifier:
                    "text-sm font-medium text-[var(--foreground)]",
                  avatarBox: "h-6 w-6",
                },
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
