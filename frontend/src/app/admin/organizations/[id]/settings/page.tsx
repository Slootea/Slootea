"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  CheckCircle, 
  Users, 
  Bot, 
  MessageSquare,
  Clock,
  AlertCircle,
  Loader2,
  Info,
  Link,
  Unlink,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { adminApi, OrganizationSettings, WhatsAppSettings, WhatsAppParameters } from "@/lib/admin-api";
import { toast } from "@/hooks/use-toast";

export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<OrganizationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");

  // WhatsApp Settings State
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectingWhatsApp, setConnectingWhatsApp] = useState(false);
  const [connectForm, setConnectForm] = useState({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
    displayPhoneNumber: "",
  });

  const hasChanges = settings && originalSettings && JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const fetchWhatsAppSettings = useCallback(async () => {
    try {
      const res = await adminApi.getWhatsAppSettings(organizationId);
      setWhatsappSettings(res.data);
    } catch (error) {
      console.error("Failed to fetch WhatsApp settings:", error);
    }
  }, [organizationId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, orgRes] = await Promise.all([
          adminApi.getOrganizationSettings(organizationId),
          adminApi.getOrganization(organizationId),
        ]);
        setSettings(settingsRes.data);
        setOriginalSettings(settingsRes.data);
        setOrgName(orgRes.data.name);
        
        // Fetch WhatsApp settings separately
        fetchWhatsAppSettings();
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast({
          title: "Error",
          description: "Failed to load organization settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, fetchWhatsAppSettings]);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const updated = await adminApi.updateOrganizationSettings(organizationId, settings);
      setSettings(updated.data);
      setOriginalSettings(updated.data);
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
    }
  };

  const updateSetting = <K extends keyof OrganizationSettings>(
    key: K,
    value: OrganizationSettings[K]
  ) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  // WhatsApp Handlers
  const handleToggleWhatsAppEnabled = async (enabled: boolean) => {
    if (!whatsappSettings) return;

    setWhatsappLoading(true);
    try {
      const res = await adminApi.updateWhatsAppSettings(organizationId, {
        enabled,
        parameters: whatsappSettings.parameters,
      });
      setWhatsappSettings(res.data);
      toast({ title: enabled ? "WhatsApp enabled" : "WhatsApp disabled" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleToggleWhatsAppParameter = async (param: keyof WhatsAppParameters, value: boolean) => {
    if (!whatsappSettings) return;

    setWhatsappLoading(true);
    try {
      const newParams = { ...whatsappSettings.parameters, [param]: value };
      const res = await adminApi.updateWhatsAppSettings(organizationId, {
        enabled: whatsappSettings.enabled,
        parameters: newParams,
      });
      setWhatsappSettings(res.data);
      toast({ title: "Notification preference updated" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleConnectWhatsApp = async () => {
    if (!connectForm.wabaId || !connectForm.phoneNumberId || !connectForm.accessToken) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setConnectingWhatsApp(true);
    try {
      const res = await adminApi.connectWhatsApp(organizationId, {
        wabaId: connectForm.wabaId,
        phoneNumberId: connectForm.phoneNumberId,
        accessToken: connectForm.accessToken,
        displayPhoneNumber: connectForm.displayPhoneNumber || undefined,
      });
      setWhatsappSettings(res.data);
      setConnectDialogOpen(false);
      setConnectForm({ wabaId: "", phoneNumberId: "", accessToken: "", displayPhoneNumber: "" });
      toast({ title: "WhatsApp connected successfully" });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    setConnectingWhatsApp(true);
    try {
      const res = await adminApi.disconnectWhatsApp(organizationId);
      setWhatsappSettings(res.data);
      toast({ title: "WhatsApp disconnected" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect WhatsApp",
        variant: "destructive",
      });
    } finally {
      setConnectingWhatsApp(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Settings not found</h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">Organization Settings</h2>
            <p className="text-sm text-muted-foreground truncate">{orgName}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Unsaved changes</span>
                </div>
                <Button variant="outline" onClick={handleReset} disabled={saving}>
                  Reset
                </Button>
              </>
            )}
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="booking" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 h-auto p-1">
          <TabsTrigger value="booking" className="flex items-center gap-2 py-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Booking</span>
          </TabsTrigger>
          <TabsTrigger value="confirmation" className="flex items-center gap-2 py-2">
            <CheckCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Confirmation</span>
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2 py-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Providers</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2 py-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2 py-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI</span>
          </TabsTrigger>
        </TabsList>

        {/* Booking Settings Tab */}
        <TabsContent value="booking" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>Booking Settings</CardTitle>
              </div>
              <CardDescription>Configure how appointments can be booked</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bufferTime" className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Buffer Time (minutes)
                  </Label>
                  <NumberInput
                    id="bufferTime"
                    min={0}
                    max={120}
                    value={settings.bufferTimeMinutes}
                    defaultValue={0}
                    onChange={(value) => updateSetting("bufferTimeMinutes", value)}
                  />
                  <p className="text-xs text-muted-foreground">Break time between consecutive appointments</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxPerDay">Max Appointments Per Day</Label>
                  <NumberInput
                    id="maxPerDay"
                    min={1}
                    max={100}
                    value={settings.maxAppointmentsPerDay}
                    defaultValue={0}
                    onChange={(value) => updateSetting("maxAppointmentsPerDay", value)}
                  />
                  <p className="text-xs text-muted-foreground">Maximum appointments per provider per day</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minAdvance">Min Advance Booking (hours)</Label>
                  <NumberInput
                    id="minAdvance"
                    min={0}
                    max={168}
                    value={settings.minAdvanceBookingHours}
                    defaultValue={0}
                    onChange={(value) => updateSetting("minAdvanceBookingHours", value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum hours before appointment can be booked</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAdvance">Max Advance Booking (days)</Label>
                  <NumberInput
                    id="maxAdvance"
                    min={1}
                    max={365}
                    value={settings.maxAdvanceBookingDays}
                    defaultValue={0}
                    onChange={(value) => updateSetting("maxAdvanceBookingDays", value)}
                  />
                  <p className="text-xs text-muted-foreground">How far in advance clients can book</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => updateSetting("timezone", value)}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {/* UTC */}
                    <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                    
                    {/* Europe */}
                    <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Dublin">Europe/Dublin (GMT/IST)</SelectItem>
                    <SelectItem value="Europe/Lisbon">Europe/Lisbon (WET/WEST)</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Berlin">Europe/Berlin (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Amsterdam">Europe/Amsterdam (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Brussels">Europe/Brussels (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Madrid">Europe/Madrid (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Rome">Europe/Rome (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Vienna">Europe/Vienna (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Zurich">Europe/Zurich (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Warsaw">Europe/Warsaw (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Prague">Europe/Prague (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Stockholm">Europe/Stockholm (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Oslo">Europe/Oslo (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Copenhagen">Europe/Copenhagen (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Helsinki">Europe/Helsinki (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Athens">Europe/Athens (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Bucharest">Europe/Bucharest (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Sofia">Europe/Sofia (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Kiev">Europe/Kiev (EET/EEST)</SelectItem>
                    <SelectItem value="Europe/Moscow">Europe/Moscow (MSK)</SelectItem>
                    <SelectItem value="Europe/Istanbul">Europe/Istanbul (TRT)</SelectItem>
                    
                    {/* Americas */}
                    <SelectItem value="America/New_York">America/New York (EST/EDT)</SelectItem>
                    <SelectItem value="America/Toronto">America/Toronto (EST/EDT)</SelectItem>
                    <SelectItem value="America/Chicago">America/Chicago (CST/CDT)</SelectItem>
                    <SelectItem value="America/Denver">America/Denver (MST/MDT)</SelectItem>
                    <SelectItem value="America/Phoenix">America/Phoenix (MST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los Angeles (PST/PDT)</SelectItem>
                    <SelectItem value="America/Vancouver">America/Vancouver (PST/PDT)</SelectItem>
                    <SelectItem value="America/Anchorage">America/Anchorage (AKST/AKDT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Pacific/Honolulu (HST)</SelectItem>
                    <SelectItem value="America/Mexico_City">America/Mexico City (CST/CDT)</SelectItem>
                    <SelectItem value="America/Bogota">America/Bogota (COT)</SelectItem>
                    <SelectItem value="America/Lima">America/Lima (PET)</SelectItem>
                    <SelectItem value="America/Santiago">America/Santiago (CLT/CLST)</SelectItem>
                    <SelectItem value="America/Buenos_Aires">America/Buenos Aires (ART)</SelectItem>
                    <SelectItem value="America/Sao_Paulo">America/Sao Paulo (BRT/BRST)</SelectItem>
                    
                    {/* Asia */}
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                    <SelectItem value="Asia/Karachi">Asia/Karachi (PKT)</SelectItem>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="Asia/Dhaka">Asia/Dhaka (BST)</SelectItem>
                    <SelectItem value="Asia/Bangkok">Asia/Bangkok (ICT)</SelectItem>
                    <SelectItem value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh (ICT)</SelectItem>
                    <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                    <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                    <SelectItem value="Asia/Hong_Kong">Asia/Hong Kong (HKT)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST)</SelectItem>
                    <SelectItem value="Asia/Taipei">Asia/Taipei (CST)</SelectItem>
                    <SelectItem value="Asia/Seoul">Asia/Seoul (KST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    
                    {/* Australia & Pacific */}
                    <SelectItem value="Australia/Perth">Australia/Perth (AWST)</SelectItem>
                    <SelectItem value="Australia/Adelaide">Australia/Adelaide (ACST/ACDT)</SelectItem>
                    <SelectItem value="Australia/Brisbane">Australia/Brisbane (AEST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</SelectItem>
                    <SelectItem value="Australia/Melbourne">Australia/Melbourne (AEST/AEDT)</SelectItem>
                    <SelectItem value="Pacific/Auckland">Pacific/Auckland (NZST/NZDT)</SelectItem>
                    <SelectItem value="Pacific/Fiji">Pacific/Fiji (FJT)</SelectItem>
                    
                    {/* Africa & Middle East */}
                    <SelectItem value="Africa/Cairo">Africa/Cairo (EET)</SelectItem>
                    <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                    <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                    <SelectItem value="Africa/Nairobi">Africa/Nairobi (EAT)</SelectItem>
                    <SelectItem value="Asia/Jerusalem">Asia/Jerusalem (IST/IDT)</SelectItem>
                    <SelectItem value="Asia/Riyadh">Asia/Riyadh (AST)</SelectItem>
                    <SelectItem value="Asia/Tehran">Asia/Tehran (IRST/IRDT)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">All appointment times will be in this timezone</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confirmation Settings Tab */}
        <TabsContent value="confirmation" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <CardTitle>Confirmation Settings</CardTitle>
              </div>
              <CardDescription>Configure appointment confirmation behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto Confirm Appointments</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically confirm new appointments without requiring client action
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoConfirmAppointments}
                    onCheckedChange={(checked) => updateSetting("autoConfirmAppointments", checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto Cancel Unconfirmed</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically cancel appointments that are not confirmed by the deadline
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoCancelUnconfirmed}
                    onCheckedChange={(checked) => updateSetting("autoCancelUnconfirmed", checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="confirmationRequired">Confirmation Required (hours before)</Label>
                  <NumberInput
                    id="confirmationRequired"
                    min={0}
                    max={168}
                    value={settings.confirmationRequiredHours}
                    defaultValue={0}
                    onChange={(value) => updateSetting("confirmationRequiredHours", value)}
                  />
                  <p className="text-xs text-muted-foreground">When to send confirmation request</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmationDeadline">Confirmation Deadline (hours before)</Label>
                  <NumberInput
                    id="confirmationDeadline"
                    min={0}
                    max={168}
                    value={settings.confirmationDeadlineHours}
                    defaultValue={0}
                    onChange={(value) => updateSetting("confirmationDeadlineHours", value)}
                  />
                  <p className="text-xs text-muted-foreground">Deadline for client to confirm</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provider Settings Tab */}
        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Provider Settings</CardTitle>
              </div>
              <CardDescription>Configure provider selection and display options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Allow Provider Selection</Label>
                    <p className="text-sm text-muted-foreground">
                      Let clients choose their preferred provider when booking
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowProviderSelection}
                    onCheckedChange={(checked) => updateSetting("allowProviderSelection", checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto Assign Provider</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign an available provider to bookings
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoAssignProvider}
                    onCheckedChange={(checked) => updateSetting("autoAssignProvider", checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Show Provider Names</Label>
                    <p className="text-sm text-muted-foreground">
                      Display provider names on the public booking page
                    </p>
                  </div>
                  <Switch
                    checked={settings.showProviderNames}
                    onCheckedChange={(checked) => updateSetting("showProviderNames", checked)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Show Provider Photos</Label>
                    <p className="text-sm text-muted-foreground">
                      Display provider photos on the public booking page
                    </p>
                  </div>
                  <Switch
                    checked={settings.showProviderPhotos}
                    onCheckedChange={(checked) => updateSetting("showProviderPhotos", checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="providerMode">Provider Selection Mode</Label>
                <Select
                  value={settings.providerSelectionMode}
                  onValueChange={(value) => updateSetting("providerSelectionMode", value)}
                >
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client_chooses">Client Chooses</SelectItem>
                    <SelectItem value="auto_assign">Auto Assign</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">How providers are assigned to appointments</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Settings Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <CardTitle>WhatsApp Notifications</CardTitle>
              </div>
              <CardDescription>
                Configure WhatsApp Business API integration for sending appointment notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">WhatsApp Connection</Label>
                    {whatsappSettings?.isConnected ? (
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
                  <p className="text-sm text-muted-foreground">
                    {whatsappSettings?.isConnected && whatsappSettings.displayPhoneNumber
                      ? `Sending notifications via ${whatsappSettings.displayPhoneNumber}`
                      : "Connect a WhatsApp Business account to send notifications"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {whatsappSettings?.isConnected ? (
                    <>
                      <Switch
                        checked={whatsappSettings.enabled}
                        onCheckedChange={handleToggleWhatsAppEnabled}
                        disabled={whatsappLoading}
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
                            Enter your WhatsApp Business API credentials to enable message notifications.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 text-sm">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p>
                                Find these values in{" "}
                                <a
                                  href="https://business.facebook.com/settings/whatsapp-business-accounts"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline font-medium"
                                >
                                  Meta Business Settings
                                </a>
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="wabaId">WABA ID *</Label>
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
                            <Label htmlFor="accessToken">Access Token *</Label>
                            <Input
                              id="accessToken"
                              type="password"
                              value={connectForm.accessToken}
                              onChange={(e) => setConnectForm({ ...connectForm, accessToken: e.target.value })}
                              placeholder="Permanent access token"
                            />
                            <p className="text-xs text-muted-foreground">
                              Use a permanent System User access token for production
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="displayPhoneNumber">Display Phone Number</Label>
                            <Input
                              id="displayPhoneNumber"
                              value={connectForm.displayPhoneNumber}
                              onChange={(e) => setConnectForm({ ...connectForm, displayPhoneNumber: e.target.value })}
                              placeholder="e.g., +1 234 567 8900"
                            />
                            <p className="text-xs text-muted-foreground">
                              Optional: The phone number to display in the UI
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

              {/* Notification Types (only show when connected) */}
              {whatsappSettings?.isConnected && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Types</h4>
                    <p className="text-sm text-muted-foreground">
                      Configure which events trigger WhatsApp notifications
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Appointment Created</Label>
                          <p className="text-xs text-muted-foreground">
                            Send when a new appointment is booked
                          </p>
                        </div>
                        <Switch
                          checked={whatsappSettings.parameters.appointmentCreated ?? true}
                          onCheckedChange={(checked) => handleToggleWhatsAppParameter("appointmentCreated", checked)}
                          disabled={whatsappLoading}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Appointment Reminder</Label>
                          <p className="text-xs text-muted-foreground">
                            Send reminder before the appointment
                          </p>
                        </div>
                        <Switch
                          checked={whatsappSettings.parameters.appointmentReminder ?? true}
                          onCheckedChange={(checked) => handleToggleWhatsAppParameter("appointmentReminder", checked)}
                          disabled={whatsappLoading}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Appointment Canceled</Label>
                          <p className="text-xs text-muted-foreground">
                            Send when an appointment is canceled
                          </p>
                        </div>
                        <Switch
                          checked={whatsappSettings.parameters.appointmentCanceled ?? true}
                          onCheckedChange={(checked) => handleToggleWhatsAppParameter("appointmentCanceled", checked)}
                          disabled={whatsappLoading}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <Label className="text-sm">Appointment Rescheduled</Label>
                          <p className="text-xs text-muted-foreground">
                            Send when an appointment is rescheduled
                          </p>
                        </div>
                        <Switch
                          checked={whatsappSettings.parameters.appointmentRescheduled ?? true}
                          onCheckedChange={(checked) => handleToggleWhatsAppParameter("appointmentRescheduled", checked)}
                          disabled={whatsappLoading}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Reminder Settings</h4>
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="reminderHours">Reminder Timing (hours before appointment)</Label>
                  <NumberInput
                    id="reminderHours"
                    min={1}
                    max={72}
                    value={settings.reminderHoursBefore}
                    defaultValue={0}
                    onChange={(value) => updateSetting("reminderHoursBefore", value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    When to send WhatsApp reminder messages before appointments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle>AI Assistant</CardTitle>
              </div>
              <CardDescription>Configure AI-powered features for bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable AI Assistant</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow AI assistant to help clients with booking questions and scheduling
                  </p>
                </div>
                <Switch
                  checked={settings.aiAssistantEnabled}
                  onCheckedChange={(checked) => updateSetting("aiAssistantEnabled", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
