"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import {
  ClipboardList,
  Plus,
  Pencil,
  Save,
  X,
  CalendarDays,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { ServiceOption, ServiceRecord } from "@/lib/types";

interface DraftRecord {
  // tempId: when the row is brand new, has no real db id yet
  tempId: string;
  // id: present if loaded from server; absent for new rows
  id?: string;
  serviceOptionId: string;
  serviceDate: string; // YYYY-MM-DD
  note: string;
}

interface ServiceRecordsTabProps {
  clientId: string;
  /** When the parent dialog closes, we want to discard edits. */
  active: boolean;
}

/** Build today's date as YYYY-MM-DD in the given IANA timezone. */
function todayInTimezone(tz?: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // 'en-CA' yields YYYY-MM-DD
    return fmt.format(new Date());
  } catch {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
}

function recordToDraft(r: ServiceRecord): DraftRecord {
  return {
    tempId: r.id,
    id: r.id,
    serviceOptionId: r.serviceOptionId,
    serviceDate: r.serviceDate,
    note: r.note ?? "",
  };
}

/** Group items by `YYYY-MM` for monthly headers in view mode. */
function groupByMonth<T extends { serviceDate: string }>(items: T[]) {
  const groups: { key: string; items: T[] }[] = [];
  for (const it of items) {
    const key = it.serviceDate.slice(0, 7); // YYYY-MM
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(it);
    else groups.push({ key, items: [it] });
  }
  return groups;
}

export function ServiceRecordsTab({ clientId, active }: ServiceRecordsTabProps) {
  const t = useTranslations("clientsPage");
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [orgTimezone, setOrgTimezone] = useState<string | undefined>(undefined);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [saving, setSaving] = useState(false);

  const optionsById = useMemo(() => {
    const map = new Map<string, ServiceOption>();
    for (const o of serviceOptions) map.set(o.id, o);
    return map;
  }, [serviceOptions]);

  const activeOptions = useMemo(
    () => serviceOptions.filter(o => o.isActive),
    [serviceOptions],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, optsRes, settingsRes] = await Promise.all([
        serviceRecordsApi.getByClient(clientId),
        serviceOptionsApi.getAllForOrganization().catch(() => null),
        organizationSettingsApi.get().catch(() => null),
      ]);
      setRecords((recRes.data as ServiceRecord[]) || []);
      // organization options endpoint returns ServiceOption[]
      const opts: ServiceOption[] =
        (optsRes?.data as ServiceOption[]) || [];
      setServiceOptions(opts);
      const tz: string | undefined =
        (settingsRes?.data as { timezone?: string } | null)?.timezone || undefined;
      setOrgTimezone(tz);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast({
        title: t("serviceRecords.loadError"),
        description: err?.response?.data?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, t, toast]);

  useEffect(() => {
    if (active) void fetchAll();
  }, [active, fetchAll]);

  // Reset edit mode if tab becomes inactive
  useEffect(() => {
    if (!active && editing) {
      setEditing(false);
      setDrafts([]);
    }
  }, [active, editing]);

  // ---- Edit mode helpers ----

  const enterEdit = () => {
    setDrafts(records.map(recordToDraft));
    setEditing(true);
  };

  const cancelEdit = () => {
    setDrafts([]);
    setEditing(false);
  };

  const addDraftRow = () => {
    if (activeOptions.length === 0) {
      toast({
        title: t("serviceRecords.noActiveOptionsTitle"),
        description: t("serviceRecords.noActiveOptionsDesc"),
        variant: "destructive",
      });
      return;
    }
    const newRow: DraftRecord = {
      tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serviceOptionId: activeOptions[0].id,
      serviceDate: todayInTimezone(orgTimezone),
      note: "",
    };
    setDrafts(prev => [newRow, ...prev]);
  };

  const updateDraft = (tempId: string, patch: Partial<DraftRecord>) => {
    setDrafts(prev => prev.map(d => (d.tempId === tempId ? { ...d, ...patch } : d)));
  };

  const removeDraft = (tempId: string) => {
    setDrafts(prev => prev.filter(d => d.tempId !== tempId));
  };

  const saveChanges = async () => {
    // Validate
    for (const d of drafts) {
      if (!d.serviceOptionId) {
        toast({
          title: t("serviceRecords.validationError"),
          description: t("serviceRecords.serviceRequired"),
          variant: "destructive",
        });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.serviceDate)) {
        toast({
          title: t("serviceRecords.validationError"),
          description: t("serviceRecords.dateInvalid"),
          variant: "destructive",
        });
        return;
      }
    }

    // Diff
    const originals = new Map(records.map(r => [r.id, r]));
    const touchedIds = new Set<string>();

    const create: Array<{ serviceOptionId: string; serviceDate: string; note?: string }> = [];
    const update: Array<{ id: string; serviceOptionId?: string; serviceDate?: string; note?: string }> = [];

    for (const d of drafts) {
      if (!d.id) {
        create.push({
          serviceOptionId: d.serviceOptionId,
          serviceDate: d.serviceDate,
          note: d.note?.trim() ? d.note : undefined,
        });
      } else {
        touchedIds.add(d.id);
        const orig = originals.get(d.id);
        if (!orig) continue;
        const changes: { id: string; serviceOptionId?: string; serviceDate?: string; note?: string } = { id: d.id };
        let dirty = false;
        if (d.serviceOptionId !== orig.serviceOptionId) {
          changes.serviceOptionId = d.serviceOptionId;
          dirty = true;
        }
        if (d.serviceDate !== orig.serviceDate) {
          changes.serviceDate = d.serviceDate;
          dirty = true;
        }
        const origNote = orig.note ?? "";
        if (d.note !== origNote) {
          changes.note = d.note;
          dirty = true;
        }
        if (dirty) update.push(changes);
      }
    }

    const deleteIds: string[] = [];
    for (const r of records) {
      if (!touchedIds.has(r.id)) deleteIds.push(r.id);
    }

    if (create.length === 0 && update.length === 0 && deleteIds.length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await serviceRecordsApi.sync({
        clientId,
        create: create.length ? create : undefined,
        update: update.length ? update : undefined,
        deleteIds: deleteIds.length ? deleteIds : undefined,
      });
      setRecords((res.data as ServiceRecord[]) || []);
      setEditing(false);
      setDrafts([]);
      toast({
        title: t("serviceRecords.saved"),
      });
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

  // ---- Render ----

  if (loading) {
    return (
      <div className="space-y-3 py-6 px-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // EDIT MODE
  if (editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-6 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Pencil className="h-4 w-4" />
            {t("serviceRecords.editTitle")}
          </div>
          <Button size="sm" variant="ghost" onClick={addDraftRow} disabled={saving}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t("serviceRecords.addRow")}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-3 py-4">
            {drafts.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-12">
                {t("serviceRecords.editEmpty")}
              </div>
            ) : (
              drafts.map((d, idx) => (
                <div
                  key={d.tempId}
                  className="rounded-lg border bg-card p-3 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary" className="mt-1.5">{idx + 1}</Badge>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("serviceRecords.service")}</Label>
                        <Select
                          value={d.serviceOptionId}
                          onValueChange={v => updateDraft(d.tempId, { serviceOptionId: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activeOptions.map(o => (
                              <SelectItem key={o.id} value={o.id}>
                                {o.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t("serviceRecords.date")}</Label>
                        <Input
                          type="date"
                          value={d.serviceDate}
                          onChange={e => updateDraft(d.tempId, { serviceDate: e.target.value })}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeDraft(d.tempId)}
                      disabled={saving}
                      className="text-destructive hover:text-destructive"
                      aria-label={t("serviceRecords.delete")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5 pl-9">
                    <Label className="text-xs">{t("serviceRecords.note")}</Label>
                    <Textarea
                      value={d.note}
                      onChange={e => updateDraft(d.tempId, { note: e.target.value })}
                      placeholder={t("serviceRecords.notePlaceholder")}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 flex items-center justify-end gap-2 px-6 py-3 border-t bg-muted/30">
          <Button variant="outline" onClick={cancelEdit} disabled={saving}>
            {t("serviceRecords.cancel")}
          </Button>
          <Button onClick={saveChanges} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {t("serviceRecords.save")}
          </Button>
        </div>
      </div>
    );
  }

  // VIEW MODE
  const grouped = groupByMonth(records);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-6 py-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          {t("serviceRecords.title")}
          {records.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {records.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="default" onClick={enterEdit}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {t("serviceRecords.editList")}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-6">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ClipboardList className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("serviceRecords.emptyTitle")}</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {t("serviceRecords.emptyDesc")}
              </p>
            </div>
            <Button size="sm" onClick={enterEdit} className="mt-2">
              <Plus className="h-4 w-4 mr-1.5" />
              {t("serviceRecords.addFirst")}
            </Button>
          </div>
        ) : (
          <div className="py-6">
            {grouped.map(group => (
              <div key={group.key} className="mb-6 last:mb-2">
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-1.5 mb-3">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {format(parseISO(`${group.key}-01`), "MMMM yyyy")}
                  </h5>
                </div>
                <div className="relative pl-6 border-l-2 border-border/60">
                  {group.items.map(item => {
                    const opt = item.serviceOption || optionsById.get(item.serviceOptionId);
                    return (
                      <div key={item.id} className="relative pb-6 last:pb-0">
                        <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center">
                          <span className="absolute inline-flex h-3 w-3 rounded-full bg-primary/30" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                        </span>
                        <div className="rounded-lg border bg-card hover:bg-accent/30 transition-colors p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>
                                  {format(parseISO(item.serviceDate), "EEE, MMM d, yyyy")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              {opt?.title || t("serviceRecords.unknownService")}
                            </Badge>
                            {opt?.duration ? (
                              <Badge variant="outline" className="gap-1 font-normal">
                                <Clock className="h-3 w-3" />
                                {opt.duration} {t("serviceRecords.minutesShort")}
                              </Badge>
                            ) : null}
                          </div>
                          {item.note && (
                            <p className="text-sm whitespace-pre-wrap text-foreground/90 pt-1">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
