"use client";

import { useEffect } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { registerTokenGetter, setAuthToken, setOrganizationContext } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { organization } = useOrganization();

  // Register a single token getter that the axios request interceptor will use
  // for every request. Removes the need for components to call getToken() and
  // setAuthToken() themselves before each fetch.
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      registerTokenGetter((opts) => getToken(opts));
      // Prime the default header so non-intercepted code paths still work.
      getToken().then(setAuthToken).catch(() => setAuthToken(null));
    } else {
      registerTokenGetter(null);
      setAuthToken(null);
    }
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
