"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMetaOAuth } from "@/hooks/use-meta-oauth";
import { 
  WhatsAppBusinessAccount, 
  WhatsAppPhoneNumber,
  WhatsAppNotificationSettings,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Link,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Phone,
  ExternalLink,
} from "lucide-react";

interface WhatsAppOAuthDialogProps {
  organizationId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (settings: WhatsAppNotificationSettings) => void;
}

/**
 * Dialog for connecting WhatsApp Business via Meta OAuth popup flow.
 * 
 * Flow:
 * 1. User clicks "Connect with Meta" button
 * 2. OAuth popup opens for Meta login
 * 3. User grants permissions
 * 4. Popup closes, dialog shows available WhatsApp Business accounts
 * 5. User selects account and phone number
 * 6. Connection is completed
 */
export function WhatsAppOAuthDialog({
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}: WhatsAppOAuthDialogProps) {
  const t = useTranslations("organization");
  
  const {
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
  } = useMetaOAuth({
    organizationId,
    onSuccess: (settings) => {
      onSuccess(settings);
      onOpenChange(false);
    },
  });

  // Selected assets for connection
  const [selectedWabaId, setSelectedWabaId] = useState<string>("");
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string>("");
  const [selectedDisplayPhone, setSelectedDisplayPhone] = useState<string>("");

  // Fetch assets when there's a pending session and dialog opens
  useEffect(() => {
    if (open && hasPendingSession && !assets) {
      fetchAssets();
    }
  }, [open, hasPendingSession, assets, fetchAssets]);

  // Reset selection when WABA changes
  useEffect(() => {
    setSelectedPhoneNumberId("");
    setSelectedDisplayPhone("");
  }, [selectedWabaId]);

  // Handle WABA selection
  const handleWabaSelect = (wabaId: string) => {
    setSelectedWabaId(wabaId);
    setSelectedPhoneNumberId("");
    setSelectedDisplayPhone("");
  };

  // Handle phone number selection
  const handlePhoneSelect = (phoneNumberId: string) => {
    setSelectedPhoneNumberId(phoneNumberId);
    
    // Find the display phone number
    if (assets && selectedWabaId) {
      const phoneNumbers = assets.phoneNumbers[selectedWabaId] || [];
      const selectedPhone = phoneNumbers.find(p => p.id === phoneNumberId);
      setSelectedDisplayPhone(selectedPhone?.display_phone_number || "");
    }
  };

  // Handle completing the connection
  const handleComplete = async () => {
    if (!selectedWabaId || !selectedPhoneNumberId) return;
    
    await completeConnection(selectedWabaId, selectedPhoneNumberId, selectedDisplayPhone);
  };

  // Handle cancel
  const handleCancel = () => {
    cancelSession();
    setSelectedWabaId("");
    setSelectedPhoneNumberId("");
    setSelectedDisplayPhone("");
    onOpenChange(false);
  };

  // Get phone numbers for selected WABA
  const phoneNumbers = assets?.phoneNumbers[selectedWabaId] || [];
  const hasAssets = assets && assets.whatsappBusinessAccounts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasPendingSession 
              ? t("notifications.whatsapp.oauth.selectAssets")
              : t("notifications.whatsapp.oauth.title")
            }
          </DialogTitle>
          <DialogDescription>
            {hasPendingSession
              ? t("notifications.whatsapp.oauth.selectAssetsDescription")
              : t("notifications.whatsapp.oauth.description")
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-auto p-0 text-xs underline"
                  onClick={clearError}
                >
                  {t("notifications.whatsapp.oauth.dismiss")}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Initial State - No pending session */}
          {!hasPendingSession && !isPopupOpen && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{t("notifications.whatsapp.oauth.requirementsInfo")}</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                    <li>{t("notifications.whatsapp.oauth.requirement1")}</li>
                    <li>{t("notifications.whatsapp.oauth.requirement2")}</li>
                    <li>{t("notifications.whatsapp.oauth.requirement3")}</li>
                  </ul>
                </div>
              </div>

              <Button
                onClick={openOAuthPopup}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                {t("notifications.whatsapp.oauth.connectWithMeta")}
              </Button>
            </div>
          )}

          {/* Popup is open */}
          {isPopupOpen && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("notifications.whatsapp.oauth.waitingForPopup")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("notifications.whatsapp.oauth.completeInPopup")}
              </p>
            </div>
          )}

          {/* Loading assets */}
          {hasPendingSession && isLoading && !assets && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("notifications.whatsapp.oauth.loadingAssets")}
              </p>
            </div>
          )}

          {/* No assets found */}
          {hasPendingSession && !isLoading && assets && !hasAssets && (
            <div className="text-center py-8">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {t("notifications.whatsapp.oauth.noAssetsFound")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("notifications.whatsapp.oauth.noAssetsFoundDescription")}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  cancelSession();
                  openOAuthPopup();
                }}
              >
                {t("notifications.whatsapp.oauth.tryAgain")}
              </Button>
            </div>
          )}

          {/* Asset selection */}
          {hasPendingSession && !isLoading && hasAssets && (
            <div className="space-y-4">
              {/* Success message */}
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t("notifications.whatsapp.oauth.permissionsGranted")}</span>
              </div>

              {/* WABA Selection */}
              <div className="space-y-2">
                <Label htmlFor="waba-select">
                  <Building2 className="h-4 w-4 inline mr-2" />
                  {t("notifications.whatsapp.oauth.selectWaba")}
                </Label>
                <Select value={selectedWabaId} onValueChange={handleWabaSelect}>
                  <SelectTrigger id="waba-select">
                    <SelectValue placeholder={t("notifications.whatsapp.oauth.selectWabaPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.whatsappBusinessAccounts.map((waba) => (
                      <SelectItem key={waba.id} value={waba.id}>
                        <div className="flex flex-col">
                          <span>{waba.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ID: {waba.id}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Number Selection */}
              {selectedWabaId && (
                <div className="space-y-2">
                  <Label htmlFor="phone-select">
                    <Phone className="h-4 w-4 inline mr-2" />
                    {t("notifications.whatsapp.oauth.selectPhone")}
                  </Label>
                  {phoneNumbers.length > 0 ? (
                    <Select value={selectedPhoneNumberId} onValueChange={handlePhoneSelect}>
                      <SelectTrigger id="phone-select">
                        <SelectValue placeholder={t("notifications.whatsapp.oauth.selectPhonePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {phoneNumbers.map((phone) => (
                          <SelectItem key={phone.id} value={phone.id}>
                            <div className="flex flex-col">
                              <span>{phone.display_phone_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {phone.verified_name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      {t("notifications.whatsapp.oauth.noPhoneNumbers")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("notifications.whatsapp.oauth.cancel")}
          </Button>
          
          {hasPendingSession && hasAssets && (
            <Button
              onClick={handleComplete}
              disabled={!selectedWabaId || !selectedPhoneNumberId || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              {t("notifications.whatsapp.oauth.connect")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
