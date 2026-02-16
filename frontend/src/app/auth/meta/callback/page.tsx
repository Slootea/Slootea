"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

/**
 * Meta OAuth Callback Page
 * 
 * This page is opened in a popup window after Meta OAuth flow completes.
 * It extracts the OAuth result from URL params and sends it to the parent window
 * via postMessage, then closes itself.
 */
export default function MetaOAuthCallbackPage() {
  const searchParams = useSearchParams();
  
  const success = searchParams.get("oauth_success") === "true";
  const organizationId = searchParams.get("oauth_org_id");
  const error = searchParams.get("oauth_error");
  const errorDescription = searchParams.get("oauth_error_description");

  useEffect(() => {
    // Send result to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "META_OAUTH_CALLBACK",
          success,
          organizationId,
          error,
          errorDescription,
        },
        window.location.origin
      );

      // Close popup after a short delay to show status
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      // If no opener (opened directly), redirect to organization settings
      setTimeout(() => {
        window.location.href = "/dashboard/organization-settings";
      }, 2000);
    }
  }, [success, organizationId, error, errorDescription]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        {success ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto animate-pulse" />
            <h1 className="text-xl font-semibold text-foreground">
              Connected Successfully!
            </h1>
            <p className="text-muted-foreground">
              Closing this window...
            </p>
          </>
        ) : error ? (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-xl font-semibold text-foreground">
              Connection Failed
            </h1>
            <p className="text-muted-foreground">
              {errorDescription || error}
            </p>
            <p className="text-sm text-muted-foreground">
              Closing this window...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
            <h1 className="text-xl font-semibold text-foreground">
              Processing...
            </h1>
            <p className="text-muted-foreground">
              Please wait while we complete the connection.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
