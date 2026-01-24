"use client";

import { useEffect } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { setAuthToken, setOrganizationContext } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { organization } = useOrganization();

  useEffect(() => {
    const setupAuth = async () => {
      if (isLoaded && isSignedIn) {
        const token = await getToken();
        setAuthToken(token);
      } else {
        setAuthToken(null);
      }
    };
    setupAuth();
  }, [isLoaded, isSignedIn, getToken]);

  // Set organization context when organization changes
  useEffect(() => {
    if (organization?.id) {
      setOrganizationContext(organization.id);
    } else {
      setOrganizationContext(null);
    }
  }, [organization?.id]);

  return <>{children}</>;
}
