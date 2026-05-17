"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Sparkles, ClipboardList } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  serviceRecordsApi,
  serviceOptionsApi,
  organizationSettingsApi,
} from "@/lib/api";
import type { Appointment, ServiceOption } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: Appointment | null;
  /** Called once the user successfully creates a record OR explicitly skips. */
  onDone?: () => void;
}

/** Build a YYYY-MM-DD string from an ISO timestamp using the given timezone. */
function isoToLocalDate(iso: string, tz?: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

export function CreateServiceRecordFromAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onDone,
}: Props) {
  const t = useTranslations("clientsPage");
  const { toast } = useToast();

  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [orgTz, setOrgTz] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [serviceOptionId, setServiceOptionId] = useState<string>("");
  const [serviceDate, setServiceDate] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const activeOptions = useMemo(
    () => options.filter(o => o.isActive),
    [options],
  );

  useEffect(() => {
    if (!open || !appointment) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [optsRes, settingsRes] = await Promise.all([
          serviceOptionsApi.getAllForOrganization().catch(() => null),
          organizationSettingsApi.get().catch(() => null),
        ]);
        if (cancelled) return;
        const opts: ServiceOption[] = (optsRes?.data as ServiceOption[]) || [];
        setOptions(opts);
        const tz: string | undefined =
          (settingsRes?.data as { timezone?: string } | null)?.timezone || undefined;
        setOrgTz(tz);

        // Prefill
        const apptOpt = opts.find(o => o.id === appointment.serviceOptionId);
        const initialOpt = apptOpt && apptOpt.isActive
          ? apptOpt.id
          : opts.find(o => o.isActive)?.id || "";
        setServiceOptionId(initialOpt);
        setServiceDate(isoToLocalDate(appointment.startTime, tz));
        setNote(""); // explicitly empty per spec
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } };
        toast({
          title: t("serviceRecords.loadError"),
          description: err?.response?.data?.message || String(e),
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, appointment, t, toast]);

  const canSave =
    !!appointment?.clientId &&
    !!serviceOptionId &&
    /^\d{4}-\d{2}-\d{2}$/.test(serviceDate);

  const handleSave = async () => {
    if (!appointment?.clientId) return;
    setSaving(true);
    try {
      await serviceRecordsApi.create({
        clientId: appointment.clientId,
        serviceOptionId,
        serviceDate,
        note: note.trim() ? note : undefined,
      });
      toast({ title: t("serviceRecords.createdFromAppointment") });
      onOpenChange(false);
      onDone?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: t("serviceRecords.saveError"),
        description: err?.response?.data?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={v => (saving ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle>
                {t("serviceRecords.fromAppointmentTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("serviceRecords.fromAppointmentDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!appointment?.clientId ? (
          <div className="text-sm text-muted-foreground py-4">
            {t("serviceRecords.noClientLinked")}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("serviceRecords.service")}</Label>
              <Select value={serviceOptionId} onValueChange={setServiceOptionId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("serviceRecords.selectService")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {activeOptions.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="h-3 w-3" />
                        {o.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("serviceRecords.date")}</Label>
              <Input
                type="date"
                value={serviceDate}
                onChange={e => setServiceDate(e.target.value)}
              />
              {orgTz && (
                <p className="text-[11px] text-muted-foreground">
                  {t("serviceRecords.tzHint", { tz: orgTz })}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("serviceRecords.note")}</Label>
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t("serviceRecords.notePlaceholder")}
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip} disabled={saving}>
            {t("serviceRecords.skip")}
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {t("serviceRecords.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
