"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { metaOAuthApi, notificationSettingsApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { 
  MetaOAuthUrlResponse, 
  WhatsAppAssetsResponse, 
  WhatsAppNotificationSettings 
} from "@/lib/types";

interface UseMetaOAuthOptions {
  organizationId: string | undefined;
  onSuccess?: (settings: WhatsAppNotificationSettings) => void;
  onError?: (error: string) => void;
  onOAuthComplete?: () => void; // Called when OAuth popup completes (before asset selection)
}

interface UseMetaOAuthReturn {
  // State
  isLoading: boolean;
  isPopupOpen: boolean;
  hasPendingSession: boolean;
  assets: WhatsAppAssetsResponse | null;
  error: string | null;
  
  // Actions
  openOAuthPopup: () => Promise<void>;
  fetchAssets: () => Promise<void>;
  completeConnection: (wabaId: string, phoneNumberId: string, displayPhoneNumber?: string) => Promise<void>;
  cancelSession: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for handling Meta OAuth popup flow for WhatsApp Business connection.
 * 
 * Flow:
 * 1. Call openOAuthPopup() to open the Meta login popup
 * 2. User grants permissions in the popup
 * 3. Popup sends postMessage and closes itself
 * 4. Hook automatically fetches assets
 * 5. User selects account and phone number
 * 6. Call completeConnection() with selected assets (auto-enables WhatsApp)
 */
export function useMetaOAuth({
  organizationId,
  onSuccess,
  onError,
  onOAuthComplete,
}: UseMetaOAuthOptions): UseMetaOAuthReturn {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [hasPendingSession, setHasPendingSession] = useState(false);
  const [assets, setAssets] = useState<WhatsAppAssetsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const popupRef = useRef<Window | null>(null);
  const popupCheckInterval = useRef<NodeJS.Timeout | null>(null);

  // Setup auth headers
  const setupAuth = useCallback(async () => {
    if (!organizationId) return false;
    
    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(organizationId);
    return true;
  }, [organizationId, getToken]);

  // Fetch WhatsApp assets after OAuth
  const fetchAssets = useCallback(async () => {
    if (!organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const authReady = await setupAuth();
      if (!authReady) {
        throw new Error("Authentication failed");
      }

      const response = await metaOAuthApi.getWhatsAppAssets(organizationId);
      setAssets(response.data as WhatsAppAssetsResponse);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to fetch WhatsApp assets";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, setupAuth, onError]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return;
      
      // Check if it's our OAuth callback message
      if (event.data?.type !== "META_OAUTH_CALLBACK") return;
      
      const { success, organizationId: msgOrgId, error: msgError, errorDescription } = event.data;
      
      // Verify organization ID matches
      if (msgOrgId !== organizationId) return;
      
      // Close popup tracking
      setIsPopupOpen(false);
      setIsLoading(false);
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
        popupCheckInterval.current = null;
      }
      popupRef.current = null;
      
      if (success) {
        // OAuth successful - set pending session and fetch assets
        setHasPendingSession(true);
        onOAuthComplete?.();
        
        // Auto-fetch assets
        await fetchAssets();
      } else if (msgError) {
        // OAuth failed
        const errorMessage = errorDescription || msgError;
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [organizationId, onError, onOAuthComplete, fetchAssets]);

  // Check for pending session on mount
  useEffect(() => {
    const checkPendingSession = async () => {
      if (!organizationId) return;
      
      try {
        const authReady = await setupAuth();
        if (!authReady) return;
        
        const response = await metaOAuthApi.hasPendingSession(organizationId);
        if (response.data.hasPendingSession) {
          setHasPendingSession(true);
          // Auto-fetch assets if there's a pending session
          await fetchAssets();
        }
      } catch (err) {
        // Ignore errors - no pending session
      }
    };
    
    checkPendingSession();
  }, [organizationId, setupAuth, fetchAssets]);

  // Open OAuth popup
  const openOAuthPopup = useCallback(async () => {
    if (!organizationId) {
      setError("Organization ID is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authReady = await setupAuth();
      if (!authReady) {
        throw new Error("Authentication failed");
      }

      // Get OAuth URL from backend
      const response = await metaOAuthApi.getOAuthUrl(organizationId);
      const { authUrl } = response.data as MetaOAuthUrlResponse;

      // Calculate popup position (center of screen)
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // Open popup
      popupRef.current = window.open(
        authUrl,
        "metaOAuth",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popupRef.current) {
        throw new Error("Failed to open popup. Please allow popups for this site.");
      }

      setIsPopupOpen(true);

      // Check if popup is closed (fallback if postMessage doesn't work)
      popupCheckInterval.current = setInterval(() => {
        if (popupRef.current?.closed) {
          clearInterval(popupCheckInterval.current!);
          popupCheckInterval.current = null;
          popupRef.current = null;
          setIsPopupOpen(false);
          setIsLoading(false);
        }
      }, 500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to start OAuth flow";
      setError(errorMessage);
      onError?.(errorMessage);
      setIsLoading(false);
    }
  }, [organizationId, setupAuth, onError]);

  // Complete connection with selected assets and auto-enable WhatsApp
  const completeConnection = useCallback(async (
    wabaId: string,
    phoneNumberId: string,
    displayPhoneNumber?: string
  ) => {
    if (!organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const authReady = await setupAuth();
      if (!authReady) {
        throw new Error("Authentication failed");
      }

      // Complete the OAuth connection
      await metaOAuthApi.completeConnection(organizationId, {
        wabaId,
        phoneNumberId,
        displayPhoneNumber,
      });

      // Auto-enable WhatsApp notifications
      const enableResponse = await notificationSettingsApi.updateWhatsAppSettings(organizationId, {
        enabled: true,
        parameters: {
          appointmentCreated: true,
          appointmentReminder: true,
          appointmentCanceled: true,
        },
      });

      setHasPendingSession(false);
      setAssets(null);
      onSuccess?.(enableResponse.data as WhatsAppNotificationSettings);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to complete connection";
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, setupAuth, onSuccess, onError]);

  // Cancel pending session
  const cancelSession = useCallback(async () => {
    if (!organizationId) return;

    try {
      const authReady = await setupAuth();
      if (!authReady) return;

      await metaOAuthApi.cancelSession(organizationId);
      setHasPendingSession(false);
      setAssets(null);
    } catch (err) {
      // Ignore errors
    }
  }, [organizationId, setupAuth]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  return {
    isLoading,
    isPopupOpen,
    hasPendingSession,
    assets,
    error,
    openOAuthPopup,
    fetchAssets,
    completeConnection,
    cancelSession,
    clearError,
  };
}
