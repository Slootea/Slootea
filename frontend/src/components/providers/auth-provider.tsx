"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthToken } from "@/lib/api";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

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

  return <>{children}</>;
}
