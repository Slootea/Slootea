"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  notificationSettingsApi,
  setAuthToken,
  setOrganizationContext,
} from "@/lib/api";
import {
  WhatsAppNotificationSettings,
} from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  MessageSquare,
  Link,
  Unlink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Settings,
} from "lucide-react";

interface ConnectFormData {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  displayPhoneNumber: string;
}

interface WhatsAppChannelSettingsProps {
  className?: string;
}

export function WhatsAppChannelSettings({ className }: WhatsAppChannelSettingsProps) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("organization");
  const { currentOrganization, isAdmin } = useOrganizationContext();

  const [settings, setSettings] = useState<WhatsAppNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);

  // Form state for WhatsApp connection
  const [connectForm, setConnectForm] = useState<ConnectFormData>({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    displayPhoneNumber: "",
  });

  const fetchSettings = useCallback(async () => {
    if (!currentOrganization) return;

    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const res = await notificationSettingsApi.getWhatsAppSettings(currentOrganization.id);
      setSettings(res.data);
    } catch (error) {
      console.error("Failed to fetch WhatsApp settings", error);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, getToken]);

  useEffect(() => {
    if (currentOrganization) {
      fetchSettings();
    }
  }, [currentOrganization, fetchSettings]);

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!settings || !currentOrganization) return;

    setSaving(true);
    try {
      const res = await notificationSettingsApi.updateWhatsAppSettings(currentOrganization.id, {
        enabled,
        parameters: settings.parameters,
      });
      setSettings(res.data);
      toast({ title: enabled ? "WhatsApp notifications enabled" : "WhatsApp notifications disabled" });
    } catch (error) {
      toast({
        title: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!currentOrganization) return;

    if (!connectForm.wabaId || !connectForm.phoneNumberId || !connectForm.accessToken) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setConnectingWhatsApp(true);
    try {
      const res = await notificationSettingsApi.connectWhatsApp(currentOrganization.id, {
        wabaId: connectForm.wabaId,
        phoneNumberId: connectForm.phoneNumberId,
        accessToken: connectForm.accessToken,
        displayPhoneNumber: connectForm.displayPhoneNumber || undefined,
      });
      setSettings(res.data);
      setConnectDialogOpen(false);
      setConnectForm({ wabaId: "", phoneNumberId: "", accessToken: "", displayPhoneNumber: "" });
      toast({ title: "WhatsApp Business connected successfully" });
    } catch (error) {
      toast({
        title: "Failed to connect WhatsApp",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!currentOrganization) return;

    setConnectingWhatsApp(true);
    try {
      const res = await notificationSettingsApi.disconnectWhatsApp(currentOrganization.id);
      setSettings(res.data);
      toast({ title: "WhatsApp Business disconnected" });
    } catch (error) {
      toast({
        title: "Failed to disconnect WhatsApp",
        variant: "destructive",
      });
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            <Label>WhatsApp Notifications</Label>
          </div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            <Label htmlFor="whatsappEnabled">
              {t("notifications.whatsapp.title") || "WhatsApp Notifications"}
            </Label>
            {settings.isConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {settings.isConnected && settings.displayPhoneNumber
              ? `Send notifications via WhatsApp (${settings.displayPhoneNumber})`
              : t("notifications.whatsapp.description") || "Send booking confirmations and reminders via WhatsApp"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings.isConnected ? (
            <>
              <Switch
                id="whatsappEnabled"
                checked={settings.enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={saving}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDisconnectWhatsApp}
                disabled={connectingWhatsApp}
                title="Disconnect WhatsApp"
              >
                {connectingWhatsApp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </>
          ) : (
            <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Link className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Connect WhatsApp Business</DialogTitle>
                  <DialogDescription>
                    Enter your WhatsApp Business API credentials from Meta Business Manager.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 text-sm">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>
                        You can find these values in your{" "}
                        <a
                          href="https://business.facebook.com/settings/whatsapp-business-accounts"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium"
                        >
                          Meta Business Settings
                        </a>{" "}
                        under WhatsApp Accounts.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wabaId">WhatsApp Business Account ID *</Label>
                    <Input
                      id="wabaId"
                      value={connectForm.wabaId}
                      onChange={(e) => setConnectForm({ ...connectForm, wabaId: e.target.value })}
                      placeholder="e.g., 123456789012345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                    <Input
                      id="phoneNumberId"
                      value={connectForm.phoneNumberId}
                      onChange={(e) => setConnectForm({ ...connectForm, phoneNumberId: e.target.value })}
                      placeholder="e.g., 123456789012345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Permanent Access Token *</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      value={connectForm.accessToken}
                      onChange={(e) => setConnectForm({ ...connectForm, accessToken: e.target.value })}
                      placeholder="Your permanent access token"
                    />
                    <p className="text-xs text-muted-foreground">
                      Generate a permanent token in Meta Business Settings → System Users
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayPhoneNumber">Display Phone Number</Label>
                    <Input
                      id="displayPhoneNumber"
                      value={connectForm.displayPhoneNumber}
                      onChange={(e) => setConnectForm({ ...connectForm, displayPhoneNumber: e.target.value })}
                      placeholder="e.g., +1 555 123 4567"
                    />
                    <p className="text-xs text-muted-foreground">
                      The phone number to display in the dashboard (optional)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConnectWhatsApp}
                    disabled={
                      connectingWhatsApp ||
                      !connectForm.wabaId ||
                      !connectForm.phoneNumberId ||
                      !connectForm.accessToken
                    }
                  >
                    {connectingWhatsApp ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Link className="h-4 w-4 mr-2" />
                    )}
                    Connect
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}
