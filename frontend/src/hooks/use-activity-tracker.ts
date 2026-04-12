"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth, useUser, useOrganization } from "@clerk/nextjs";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SESSION_STORAGE_KEY = "slootea_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function useActivityTracker() {
  const pathname = usePathname();
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string>("");

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socket = io(`${apiUrl}/monitoring`, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("[ActivityTracker] Connected to monitoring");
    });

    socket.on("disconnect", () => {
      console.log("[ActivityTracker] Disconnected from monitoring");
    });

    socketRef.current = socket;
  }, []);

  const trackActivity = useCallback(() => {
    if (!socketRef.current?.connected) return;
    if (!sessionIdRef.current) return;

    socketRef.current.emit("track:activity", {
      sessionId: sessionIdRef.current,
      clerkUserId: userId || undefined,
      email: user?.primaryEmailAddress?.emailAddress,
      name: user?.fullName || user?.firstName || undefined,
      organizationId: organization?.id,
      organizationName: organization?.name,
      currentPath: pathname,
    });
  }, [pathname, userId, user, organization]);

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("track:disconnect", {
          sessionId: sessionIdRef.current,
        });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  // Track activity on pathname change
  useEffect(() => {
    // Small delay to ensure socket is connected
    const timeoutId = setTimeout(() => {
      trackActivity();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pathname, trackActivity]);

  // Track activity periodically (heartbeat)
  useEffect(() => {
    const intervalId = setInterval(() => {
      trackActivity();
    }, 30000); // Every 30 seconds

    return () => clearInterval(intervalId);
  }, [trackActivity]);

  // Track when user info changes
  useEffect(() => {
    trackActivity();
  }, [isSignedIn, userId, user, organization, trackActivity]);
}
