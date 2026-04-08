"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import {
  Plus,
  RefreshCw,
  User as UserIcon,
  Clock,
  Briefcase,
  Image as ImageIcon,
  CalendarX,
  Trash2,
  Search,
  CheckSquare,
  Square,
} from "lucide-react";
import {
  Availability,
  BlockedTime,
  ExternalProvider,
  OrganizationMember,
  ServiceOption,
} from "@/lib/types";
import { AvailabilityRow } from "./availability-row";
import { ExternalProviderFormData } from "./types";

interface ProviderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingType: 'member' | 'external';
  editingMember: OrganizationMember | null;
  editingProvider: ExternalProvider | null;
  formData: ExternalProviderFormData;
  assignedServiceIds: string[];
  providerAvailability: Availability[];
  blockedTimes: BlockedTime[];
  serviceOptions: ServiceOption[];
  availabilityLoading: boolean;
  blockedTimesLoading: boolean;
  saving: boolean;
  serviceSearch: string;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  onFormDataChange: (data: Partial<ExternalProviderFormData>) => void;
  onServiceToggle: (serviceId: string, checked: boolean) => void;
  onBulkAssignServices: () => Promise<void>;
  onBulkClearServices: () => Promise<void>;
  onServiceSearchChange: (search: string) => void;
  onAddAvailability: (day: number) => void;
  onDeleteAvailability: (id: string) => void;
  onAddBlockedTime: () => void;
  onDeleteBlockedTime: (id: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => Promise<void>;
}

export function ProviderEditDialog({
  open,
  onOpenChange,
  editingType,
  editingMember,
  editingProvider,
  formData,
  assignedServiceIds,
  providerAvailability,
  blockedTimes,
  serviceOptions,
  availabilityLoading,
  blockedTimesLoading,
  saving,
  serviceSearch,
  activeTab,
  onActiveTabChange,
  onFormDataChange,
  onServiceToggle,
  onBulkAssignServices,
  onBulkClearServices,
  onServiceSearchChange,
  onAddAvailability,
  onDeleteAvailability,
  onAddBlockedTime,
  onDeleteBlockedTime,
  onImageUpload,
  onSave,
}: ProviderEditDialogProps) {
  const t = useTranslations('providersPage');
  const common = useTranslations('common');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editingName = editingType === 'member' 
    ? `${editingMember?.user?.firstName || ''} ${editingMember?.user?.lastName || ''}`.trim() || 'Member'
    : editingProvider?.name || 'Provider';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingType === 'member' 
              ? `Manage ${editingName}` 
              : (editingProvider ? t('dialog.editTitle') : t('dialog.createTitle'))
            }
          </DialogTitle>
          <DialogDescription>
            {editingType === 'member' 
              ? 'Manage services, availability and blocked times for this provider.'
              : (editingProvider ? t('dialog.editDescription') : t('dialog.createDescription'))
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={onActiveTabChange} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className={editingType === 'external' ? "grid w-full grid-cols-4" : "grid w-full grid-cols-3"}>
            {editingType === 'external' && (
              <TabsTrigger value="details">
                <UserIcon className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
            )}
            <TabsTrigger value="services" disabled={editingType === 'external' && !editingProvider}>
              <Briefcase className="h-4 w-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="availability" disabled={editingType === 'external' && !editingProvider}>
              <Clock className="h-4 w-4 mr-2" />
              Availability
            </TabsTrigger>
            <TabsTrigger value="blocked" disabled={editingType === 'external' && !editingProvider}>
              <CalendarX className="h-4 w-4 mr-2" />
              Blocked Times
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Details Tab (External only) */}
            {editingType === 'external' && (
              <TabsContent value="details" className="mt-0 space-y-4">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    {formData.imageBase64 ? (
                      <AvatarImage src={formData.imageBase64} />
                    ) : null}
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {formData.name ? formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : <ImageIcon className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      {t('dialog.uploadImage')}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onImageUpload}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('dialog.imageHint')}
                    </p>
                    {formData.imageBase64 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 text-destructive"
                        onClick={() => onFormDataChange({ imageBase64: "" })}
                      >
                        {t('dialog.removeImage')}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{t('dialog.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => onFormDataChange({ name: e.target.value })}
                    placeholder={t('dialog.namePlaceholder')}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => onFormDataChange({ isActive: checked })}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    {t('dialog.activeLabel')}
                  </Label>
                </div>
              </TabsContent>
            )}

            {/* Services Tab */}
            <TabsContent value="services" className="mt-0">
              {serviceOptions.length === 0 ? (
                <Alert>
                  <AlertDescription>{t('services.noServices')}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {/* Header with stats and bulk actions */}
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      {assignedServiceIds.length} of {serviceOptions.length} services assigned
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onBulkAssignServices}
                        disabled={assignedServiceIds.length === serviceOptions.length}
                      >
                        <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onBulkClearServices}
                        disabled={assignedServiceIds.length === 0}
                      >
                        <Square className="h-3.5 w-3.5 mr-1.5" />
                        Clear All
                      </Button>
                    </div>
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search services..."
                      value={serviceSearch}
                      onChange={(e) => onServiceSearchChange(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Services list */}
                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                    {serviceOptions
                      .filter(service => 
                        service.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                        service.description?.toLowerCase().includes(serviceSearch.toLowerCase())
                      )
                      .sort((a, b) => {
                        // Show assigned first
                        const aAssigned = assignedServiceIds.includes(a.id);
                        const bAssigned = assignedServiceIds.includes(b.id);
                        if (aAssigned && !bAssigned) return -1;
                        if (!aAssigned && bAssigned) return 1;
                        return a.title.localeCompare(b.title);
                      })
                      .map((service) => {
                        const isAssigned = assignedServiceIds.includes(service.id);
                        return (
                          <div
                            key={service.id}
                            className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors hover:bg-muted/80 ${
                              isAssigned ? 'bg-primary/5 border border-primary/20' : 'bg-muted/40'
                            }`}
                            onClick={() => onServiceToggle(service.id, !isAssigned)}
                          >
                            <Checkbox
                              id={`service-${service.id}`}
                              checked={isAssigned}
                              onCheckedChange={(checked) => onServiceToggle(service.id, checked as boolean)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm">{service.title}</span>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {service.duration}m
                            </Badge>
                          </div>
                        );
                      })}
                    {serviceOptions.filter(service => 
                      service.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                      service.description?.toLowerCase().includes(serviceSearch.toLowerCase())
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No services match &quot;{serviceSearch}&quot;
                      </p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability" className="mt-0">
              {availabilityLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <div className="space-y-0">
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('availability.description')}
                  </p>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <AvailabilityRow
                      key={day}
                      day={day}
                      availabilities={providerAvailability}
                      onAdd={() => onAddAvailability(day)}
                      onDelete={onDeleteAvailability}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Blocked Times Tab */}
            <TabsContent value="blocked" className="mt-0">
              {blockedTimesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('blockedTime.description')}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onAddBlockedTime}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('blockedTime.add')}
                    </Button>
                  </div>

                  {blockedTimes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('blockedTime.empty')}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blockedTimes.map((bt) => (
                        <div
                          key={bt.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <div className="font-medium">
                              {format(parseISO(bt.date), 'EEEE, MMMM d, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {bt.isFullDay ? t('blockedTime.fullDay') : `${bt.startTime?.slice(0, 5)} - ${bt.endTime?.slice(0, 5)}`}
                              {bt.reason && ` - ${bt.reason}`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteBlockedTime(bt.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {editingType === 'member' ? common('close') || 'Close' : common('cancel')}
          </Button>
          {editingType === 'external' && (
            <Button onClick={onSave} disabled={saving}>
              {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {editingProvider ? common('save') : common('create')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
