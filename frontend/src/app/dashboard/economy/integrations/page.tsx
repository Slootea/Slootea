"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plug,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import { useToast } from "@/components/ui/use-toast";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { economyApi, setAuthToken, setOrganizationContext, ParasutStatus } from "@/lib/api";

export default function IntegrationsPage() {
  const { getToken } = useAuth();
  const { currentOrganization, userRole } = useOrganizationContext();
  const t = useTranslations("economyPage");
  const tCommon = useTranslations("common");
  const { toast } = useToast();

  useSetPageHeader(t("integrations.title"), t("integrations.description"));

  const isAdmin = userRole === "owner" || userRole === "admin";

  const [parasutStatus, setParasutStatus] = useState<ParasutStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [formData, setFormData] = useState({
    companyId: "",
    username: "",
    password: "",
  });

  const setupAuth = useCallback(async () => {
    if (!currentOrganization) return false;
    const token = await getToken();
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);
    return true;
  }, [currentOrganization, getToken]);

  const fetchStatus = useCallback(async () => {
    if (!(await setupAuth())) return;
    try {
      const { data } = await economyApi.getParasutStatus();
      setParasutStatus(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [setupAuth]);

  useEffect(() => {
    if (currentOrganization && isAdmin) {
      fetchStatus();
    }
  }, [currentOrganization, isAdmin, fetchStatus]);

  const handleConnect = async () => {
    if (!formData.companyId || !formData.username || !formData.password) return;
    setConnecting(true);
    try {
      if (!(await setupAuth())) return;
      const { data } = await economyApi.connectParasut(formData);
      setParasutStatus(data);
      toast({ title: tCommon("success"), description: t("integrations.parasut.connectedSuccess") });
      setConnectDialogOpen(false);
      setFormData({ companyId: "", username: "", password: "" });
    } catch (err: any) {
      toast({
        title: tCommon("error"),
        description: err?.response?.data?.message || t("integrations.parasut.connectionFailed"),
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!(await setupAuth())) return;
      await economyApi.disconnectParasut();
      setParasutStatus({ connected: false });
      toast({ title: tCommon("success"), description: t("integrations.parasut.disconnectedSuccess") });
    } catch {
      toast({ title: tCommon("error"), description: t("integrations.parasut.disconnectFailed"), variant: "destructive" });
    }
    setDisconnectDialogOpen(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      if (!(await setupAuth())) return;
      const { data } = await economyApi.syncParasut();
      toast({
        title: t("integrations.parasut.syncSuccess"),
        description: `${data.imported} ${t("integrations.parasut.imported")}, ${data.skipped} ${t("integrations.parasut.skipped")}`,
      });
      fetchStatus();
    } catch (err: any) {
      toast({
        title: t("integrations.parasut.syncError"),
        description: err?.response?.data?.message || "Sync failed",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (!currentOrganization) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t("noOrganization")}</p></div>;
  }
  if (!isAdmin) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t("adminOnly")}</p></div>;
  }
  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const isConnected = parasutStatus?.connected;

  return (
    <div className="container py-6 space-y-6">
      {/* Parasut Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10">
                <Plug className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("integrations.parasut.title")}</CardTitle>
                <CardDescription>{t("integrations.parasut.description")}</CardDescription>
              </div>
            </div>
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className={isConnected ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : ""}
            >
              {isConnected ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" />{t("integrations.parasut.connected")}</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" />{t("integrations.parasut.notConnected")}</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              {/* Connection Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground">{t("integrations.parasut.companyId")}</p>
                  <p className="text-sm font-medium">{parasutStatus?.companyId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("integrations.parasut.username")}</p>
                  <p className="text-sm font-medium">{parasutStatus?.username || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("integrations.parasut.statusLabel")}</p>
                  <div className="flex items-center gap-1">
                    {parasutStatus?.syncStatus === "success" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    {parasutStatus?.syncStatus === "error" && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    {parasutStatus?.syncStatus === "syncing" && <Loader2 className="h-3 w-3 animate-spin" />}
                    <p className="text-sm font-medium capitalize">{parasutStatus?.syncStatus || t("integrations.parasut.statusIdle")}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("integrations.parasut.lastSync")}</p>
                  <p className="text-sm font-medium">
                    {parasutStatus?.lastSyncAt
                      ? new Date(parasutStatus.lastSyncAt).toLocaleString()
                      : t("integrations.parasut.neverSynced")}
                  </p>
                </div>
              </div>

              {parasutStatus?.lastSyncError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  {parasutStatus.lastSyncError}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  {syncing ? t("integrations.parasut.syncing") : t("integrations.parasut.sync")}
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setDisconnectDialogOpen(true)}
                >
                  {t("integrations.parasut.disconnect")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("integrations.parasut.connectDescription")}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setConnectDialogOpen(true)}>
                  <Plug className="h-4 w-4 mr-1" />
                  {t("integrations.parasut.connect")}
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://www.parasut.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {t("integrations.parasut.website")}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* More integrations placeholder */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Plug className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">{t("integrations.moreComingSoon")}</p>
          <p className="text-sm text-muted-foreground">
            {t("integrations.moreComingSoonDesc")}
          </p>
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("integrations.parasut.connectDialogTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t("integrations.parasut.companyId")} *</Label>
              <Input
                value={formData.companyId}
                onChange={(e) => setFormData((f) => ({ ...f, companyId: e.target.value }))}
                placeholder={t("integrations.parasut.companyIdPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("integrations.parasut.username")} *</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData((f) => ({ ...f, username: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("integrations.parasut.password")} *</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleConnect}
              disabled={connecting || !formData.companyId || !formData.username || !formData.password}
            >
              {connecting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {t("integrations.parasut.connect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Dialog */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("integrations.parasut.disconnect")}</AlertDialogTitle>
            <AlertDialogDescription>{t("integrations.parasut.disconnectConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>{t("integrations.parasut.disconnect")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
