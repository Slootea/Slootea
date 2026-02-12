"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { useTranslations } from "next-intl";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";;
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  Loader2,
  Plus,
  Search,
  Check,
  ChevronsUpDown,
  UserPlus,
  Users,
  AlertTriangle,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { ServiceOption, Client, Provider, AvailabilityCheckResult } from "@/lib/types";
import { clientsApi, userServiceOptionsApi, appointmentsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onSelectedDateChange?: (date: Date) => void;
  selectedTime: string;
  serviceOptions: ServiceOption[];
  isAdmin: boolean;
  currentUserClerkId: string;
  saving: boolean;
  onSave: (data: {
    serviceOptionId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    providerId?: string;
    notes?: string;
    startTime: string;
  }) => void;
  /** If true, dialog was opened from "Add Appointment" button, not calendar click */
  fromButton?: boolean;
  /** Pre-selected provider ID (Clerk ID) from calendar member filter */
  preselectedProviderId?: string;
  /** Organization timezone (e.g., 'Europe/Istanbul', 'America/New_York'). Defaults to 'UTC' */
  timezone?: string;
}

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  selectedDate,
  onSelectedDateChange,
  selectedTime,
  serviceOptions,
  isAdmin,
  currentUserClerkId,
  saving,
  onSave,
  fromButton = false,
  preselectedProviderId,
  timezone = 'UTC',
}: CreateAppointmentDialogProps) {
  const t = useTranslations("calendarPage.createDialog");
  const { locale } = useLocale();
  const dateLocale = locale === "tr" ? tr : enUS;
  
  // Form state
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [clientTab, setClientTab] = useState<"existing" | "new">("existing");
  const [notes, setNotes] = useState("");

  // Client search state
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);

  // Provider state for service-specific providers
  const [serviceProviders, setServiceProviders] = useState<Provider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(false);

  // New client form state
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  // Time state
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(selectedDate);
  const [appointmentTime, setAppointmentTime] = useState(selectedTime);

  // Conflict state
  const [availabilityCheck, setAvailabilityCheck] = useState<AvailabilityCheckResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Ref to skip availability checks when time was just set from "Use this slot" button
  // Uses a counter to handle multiple effect triggers from date/time/selectedDate changes
  const skipAvailabilityCheckCountRef = useRef(0);
  
  // Ref to track previous open state to only reset form on actual dialog open
  const wasOpenRef = useRef(false);

  // Check availability when time changes
  const checkAvailability = useCallback(async (
    serviceId: string, 
    date: Date, 
    time: string, 
    providerId?: string
  ) => {
    if (!serviceId || !date || !time) return;
    
    const [hours, minutes] = time.split(":").map(Number);
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);
    
    setCheckingAvailability(true);
    setAvailabilityCheck(null);
    
    try {
      const response = await appointmentsApi.checkAvailability({
        serviceOptionId: serviceId,
        startTime: startTime.toISOString(),
        providerId: providerId || undefined,
      });
      
      setAvailabilityCheck(response.data as AvailabilityCheckResult);
    } catch (error) {
      console.error("Failed to check availability:", error);
    } finally {
      setCheckingAvailability(false);
    }
  }, []);

  // Reset form when dialog opens (only on actual open, not when selectedDate changes)
  useEffect(() => {
    // Only reset when dialog is opening (was closed, now open)
    if (open && !wasOpenRef.current) {
      setSelectedService("");
      setSelectedProvider("");
      setServiceProviders([]);
      setClientTab("existing");
      setNotes("");
      setSelectedClient(null);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setAppointmentDate(selectedDate);
      setAppointmentTime(selectedTime);
      setClientSearchQuery("");
      setAvailabilityCheck(null);
      skipAvailabilityCheckCountRef.current = 0;
    }
    wasOpenRef.current = open;
  }, [open, selectedDate, selectedTime]);

  // Fetch providers when service changes
  useEffect(() => {
    const fetchProviders = async () => {
      if (!selectedService || !isAdmin) {
        setServiceProviders([]);
        return;
      }

      setProvidersLoading(true);
      try {
        const response = await userServiceOptionsApi.getProvidersForService(selectedService);
        const providers = response.data || [];
        
        // Deduplicate providers by clerkId or id
        const uniqueProviders = providers.filter((provider: Provider, index: number, self: Provider[]) => 
          index === self.findIndex((p) => (p.clerkId || p.id) === (provider.clerkId || provider.id))
        );
        
        setServiceProviders(uniqueProviders);
        
        // Reset provider selection when service changes
        setSelectedProvider("");
        
        // Priority for provider selection:
        // 1. If preselectedProviderId is set and that provider is in the list, use it
        // 2. If only one provider, auto-select them
        // 3. Otherwise, don't auto-select (let admin choose)
        if (preselectedProviderId && preselectedProviderId !== "all") {
          const preselectedProvider = uniqueProviders.find((p: Provider) => p.clerkId === preselectedProviderId);
          if (preselectedProvider) {
            setSelectedProvider(preselectedProviderId);
          } else if (uniqueProviders.length === 1) {
            setSelectedProvider(uniqueProviders[0].clerkId || uniqueProviders[0].id);
          }
        } else if (uniqueProviders.length === 1) {
          // If only one provider, auto-select them
          setSelectedProvider(uniqueProviders[0].clerkId || uniqueProviders[0].id);
        }
        // If multiple providers and no preselection, don't auto-select
      } catch (error) {
        console.error("Failed to fetch providers for service:", error);
        setServiceProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchProviders();
  }, [selectedService, isAdmin, preselectedProviderId]);

  // Check availability when date/time changes
  useEffect(() => {
    if (!selectedService || !appointmentDate || !appointmentTime) return;
    
    // Skip if we just set the time from next available result
    // Decrement counter each time effect runs until it reaches 0
    if (skipAvailabilityCheckCountRef.current > 0) {
      skipAvailabilityCheckCountRef.current--;
      return;
    }
    
    // Debounce the availability check
    const timeoutId = setTimeout(() => {
      checkAvailability(
        selectedService, 
        appointmentDate, 
        appointmentTime, 
        isAdmin ? selectedProvider : undefined
      );
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [selectedService, appointmentDate, appointmentTime, selectedProvider, isAdmin, checkAvailability]);

  // Update date when selectedDate changes (from calendar click)
  useEffect(() => {
    if (selectedDate && !fromButton) {
      setAppointmentDate(selectedDate);
    }
  }, [selectedDate, fromButton]);

  // Update time when selectedTime changes
  useEffect(() => {
    if (!fromButton) {
      setAppointmentTime(selectedTime);
    }
  }, [selectedTime, fromButton]);

  // Fetch clients for search
  const fetchClients = useCallback(async (search?: string) => {
    setClientsLoading(true);
    try {
      const response = await clientsApi.getAll({
        search,
        limit: 20,
        sortBy: "name",
        sortOrder: "ASC",
      });
      setClients(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  // Fetch clients on mount
  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open, fetchClients]);

  // Search clients when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (clientSearchQuery) {
        fetchClients(clientSearchQuery);
      } else {
        fetchClients();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [clientSearchQuery, fetchClients]);

  // Get selected service details
  const selectedServiceOption = serviceOptions.find((s) => s.id === selectedService);

  // Use next available suggestion from conflict check
  const useNextAvailable = () => {
    const nextSlot = availabilityCheck?.nextAvailable;
    
    if (nextSlot) {
      const nextDateUtc = new Date(nextSlot.startTime);
      
      // Skip the next availability checks since we're using a suggested available slot
      // Set to 3 to handle multiple effect triggers (date change, time change, parent selectedDate change)
      skipAvailabilityCheckCountRef.current = 3;
      // Clear any conflict state
      setAvailabilityCheck(null);
      
      // Extract date and time in the organization's timezone
      // The startTime is in UTC, we need to get the local date/time in the org timezone
      const dateInTz = formatInTimeZone(nextDateUtc, timezone, "yyyy-MM-dd");
      const timeInTz = formatInTimeZone(nextDateUtc, timezone, "HH:mm");
      
      // Create a date object for the calendar (using the date part in org timezone)
      // We add T12:00:00 to avoid timezone edge cases when creating the date
      const localDate = new Date(dateInTz + "T12:00:00");
      
      setAppointmentDate(localDate);
      setAppointmentTime(timeInTz);
      if (onSelectedDateChange) {
        onSelectedDateChange(localDate);
      }
      // Don't change provider - only update date and time
    }
  };

  // Handle save
  const handleSave = () => {
    if (!selectedService || !appointmentDate) return;

    let clientName = "";
    let clientEmail = "";
    let clientPhone = "";

    if (clientTab === "existing" && selectedClient) {
      clientName = selectedClient.name;
      clientEmail = selectedClient.email || "";
      clientPhone = selectedClient.phone;
    } else if (clientTab === "new") {
      clientName = newClientName;
      clientEmail = newClientEmail;
      clientPhone = newClientPhone;
    }

    if (!clientName) {
      return;
    }

    // Build start time from date and time
    const [hours, minutes] = appointmentTime.split(":").map(Number);
    const startTime = new Date(appointmentDate);
    startTime.setHours(hours, minutes, 0, 0);

    onSave({
      serviceOptionId: selectedService,
      clientName,
      clientEmail: clientEmail || undefined,
      clientPhone: clientPhone || undefined,
      providerId: isAdmin && selectedProvider ? selectedProvider : undefined,
      notes: notes || undefined,
      startTime: startTime.toISOString(),
    });
  };

  // Validation - for admin, require provider selection if providers exist
  const providerValid = !isAdmin || serviceProviders.length === 0 || selectedProvider;
  const hasConflict = availabilityCheck && !availabilityCheck.available;
  // Check if the conflict is only about minimum advance booking time - allow override for manual creation
  const isMinAdvanceBookingConflict = hasConflict && availabilityCheck?.conflict?.reason?.includes('hours in advance');
  // Block form submission only for real conflicts (not minimum advance booking which admins can override)
  const hasBlockingConflict = hasConflict && !isMinAdvanceBookingConflict;
  const isValid =
    selectedService &&
    appointmentDate &&
    appointmentTime &&
    providerValid &&
    !hasBlockingConflict &&
    ((clientTab === "existing" && selectedClient) ||
      (clientTab === "new" && newClientName && newClientPhone));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {fromButton 
              ? t("descriptionFromButton")
              : appointmentDate 
                ? t("descriptionWithDate", { date: format(appointmentDate, "EEEE, MMMM d, yyyy", { locale: dateLocale }) })
                : t("descriptionNoDate")
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label>{t("service")} *</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectService")} />
              </SelectTrigger>
              <SelectContent>
                {serviceOptions.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t("noServicesAvailable")}
                  </div>
                ) : (
                  serviceOptions.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center gap-2">
                        <span>{service.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {service.duration} min
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedServiceOption && (
              <p className="text-xs text-muted-foreground">
                {t("duration")}: {selectedServiceOption.duration} minutes
                {selectedServiceOption.description && (
                  <> • {selectedServiceOption.description}</>
                )}
              </p>
            )}
          </div>

          {/* Provider Selection (Admin only) */}
          {isAdmin && selectedService && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("assignToProvider")}
              </Label>
              {providersLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loadingProviders")}
                </div>
              ) : serviceProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noProvidersAssigned")}
                </p>
              ) : (
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectProvider")} />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceProviders.map((provider, index) => (
                      <SelectItem 
                        key={provider.clerkId || provider.id || `provider-${index}`} 
                        value={provider.clerkId || provider.id}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={provider.imageUrl} />
                            <AvatarFallback className="text-xs">
                              {(provider.firstName?.[0] || "U").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {provider.firstName
                              ? `${provider.firstName} ${provider.lastName || ""}`
                              : "Provider"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t("date")}
              </Label>
              <Input
                type="date"
                value={appointmentDate ? format(appointmentDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    const newDate = new Date(e.target.value + "T12:00:00");
                    setAppointmentDate(newDate);
                    if (onSelectedDateChange) {
                      onSelectedDateChange(newDate);
                    }
                  }
                }}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("time")}
                {checkingAvailability && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </Label>
              <Input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
              />
            </div>
          </div>

          {/* Conflict Warning */}
          {availabilityCheck && !availabilityCheck.available && !checkingAvailability && (
            <Alert variant={isMinAdvanceBookingConflict ? "default" : "destructive"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{isMinAdvanceBookingConflict ? t("note") : t("timeSlotUnavailable")}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  {availabilityCheck.conflict?.reason || t("timeSlotUnavailable")}
                  {isMinAdvanceBookingConflict && " You can still create this appointment manually."}
                </p>
                {availabilityCheck.nextAvailable && (
                  <div className="flex items-center gap-2 mt-2">
                    <CalendarClock className="h-4 w-4" />
                    <span className="text-sm">
                      {t("nextAvailable")} {formatInTimeZone(parseISO(availabilityCheck.nextAvailable.startTime), timezone, "MMM d 'at' h:mm a")}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={useNextAvailable}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t("useThisSlot")}
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Client Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("client")} *
            </Label>

            <Tabs value={clientTab} onValueChange={(v) => setClientTab(v as "existing" | "new")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing" className="gap-2">
                  <Search className="h-4 w-4" />
                  {t("searchExisting")}
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t("newClient")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-3 mt-3">
                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientPopoverOpen}
                      className="w-full justify-between"
                    >
                      {selectedClient ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{selectedClient.name}</span>
                          <span className="text-muted-foreground text-xs">
                            ({selectedClient.phone})
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t("searchForClient")}</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={t("searchByNamePhoneEmail")}
                        value={clientSearchQuery}
                        onValueChange={setClientSearchQuery}
                      />
                      <CommandList>
                        {clientsLoading ? (
                          <div className="p-4 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : clients.length === 0 ? (
                          <CommandEmpty>
                            {t("noClientsFound")}
                            <Button
                              variant="link"
                              className="block mx-auto mt-2"
                              onClick={() => {
                                setClientTab("new");
                                setClientPopoverOpen(false);
                              }}
                            >
                              {t("createNewClient")}
                            </Button>
                          </CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={client.id}
                                onSelect={() => {
                                  setSelectedClient(client);
                                  setClientPopoverOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedClient?.id === client.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{client.name}</span>
                                    {client.activePenalty && (
                                      <Badge variant="destructive" className="text-xs">
                                        {client.activePenalty.type === "ban"
                                          ? t("banned")
                                          : t("suspended")}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {client.phone}
                                    </span>
                                    {client.email && (
                                      <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {client.email}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedClient && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedClient.name}</span>
                      <Badge variant="outline">
                        {t("completedAppointments", { count: selectedClient.completedAppointments })}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedClient.phone}
                      </span>
                      {selectedClient.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedClient.email}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="client-name">{t("name")} *</Label>
                  <Input
                    id="client-name"
                    placeholder={t("clientFullName")}
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">{t("email")}</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder={t("emailOptional")}
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">{t("phone")} *</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    placeholder={t("phonePlaceholder")}
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {isValid && selectedServiceOption && (
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <p className="text-sm font-medium">{t("preview")}</p>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">{t("previewService")}:</span>{" "}
                  {selectedServiceOption.title}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("previewClient")}:</span>{" "}
                  {clientTab === "existing" ? selectedClient?.name : newClientName}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("previewDate")}:</span>{" "}
                  {appointmentDate && format(appointmentDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })}
                </p>
                <p>
                  <span className="text-muted-foreground">{t("previewTime")}:</span>{" "}
                  {appointmentDate && appointmentTime &&
                    format(
                      new Date(
                        appointmentDate.getFullYear(),
                        appointmentDate.getMonth(),
                        appointmentDate.getDate(),
                        parseInt(appointmentTime.split(":")[0]),
                        parseInt(appointmentTime.split(":")[1])
                      ),
                      "h:mm a"
                    )}{" "}
                  ({selectedServiceOption.duration} min)
                </p>
                {isAdmin && selectedProvider && (
                  <p>
                    <span className="text-muted-foreground">{t("previewProvider")}:</span>{" "}
                    {serviceProviders.find((p) => p.clerkId === selectedProvider)?.firstName ||
                      "Selected Provider"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !isValid}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("creating")}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t("createAppointment")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
