"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { ServiceOption, Client, Provider } from "@/lib/types";
import { clientsApi, userServiceOptionsApi } from "@/lib/api";
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
}: CreateAppointmentDialogProps) {
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
  const [appointmentTime, setAppointmentTime] = useState(selectedTime);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedService("");
      setSelectedProvider("");
      setServiceProviders([]);
      setClientTab("existing");
      setNotes("");
      setSelectedClient(null);
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setAppointmentTime(selectedTime);
      setClientSearchQuery("");
    }
  }, [open, selectedTime]);

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
        
        // If current user is in the providers list, auto-select them
        const currentUserProvider = uniqueProviders.find((p: Provider) => p.clerkId === currentUserClerkId);
        if (currentUserProvider) {
          setSelectedProvider(currentUserClerkId);
        } else if (uniqueProviders.length === 1) {
          // If only one provider, auto-select them
          setSelectedProvider(uniqueProviders[0].clerkId || uniqueProviders[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch providers for service:", error);
        setServiceProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchProviders();
  }, [selectedService, isAdmin, currentUserClerkId]);

  // Update time when selectedTime changes
  useEffect(() => {
    setAppointmentTime(selectedTime);
  }, [selectedTime]);

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

  // Handle save
  const handleSave = () => {
    if (!selectedService || !selectedDate) return;

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
    const startTime = new Date(selectedDate);
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
  const isValid =
    selectedService &&
    selectedDate &&
    appointmentTime &&
    providerValid &&
    ((clientTab === "existing" && selectedClient) ||
      (clientTab === "new" && newClientName && newClientPhone));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Appointment
          </DialogTitle>
          <DialogDescription>
            {selectedDate 
              ? `Schedule a new appointment for ${format(selectedDate, "EEEE, MMMM d, yyyy")}`
              : "Schedule a new appointment by selecting a date and time"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                type="date"
                value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  if (e.target.value && onSelectedDateChange) {
                    onSelectedDateChange(new Date(e.target.value + "T12:00:00"));
                  }
                }}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </Label>
              <Input
                type="time"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
              />
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label>Service *</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {serviceOptions.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No services available
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
                Duration: {selectedServiceOption.duration} minutes
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
                Assign to Provider
              </Label>
              {providersLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading providers...
                </div>
              ) : serviceProviders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No providers assigned to this service
                </p>
              ) : (
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
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

          {/* Client Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Client *
            </Label>

            <Tabs value={clientTab} onValueChange={(v) => setClientTab(v as "existing" | "new")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing" className="gap-2">
                  <Search className="h-4 w-4" />
                  Search Existing
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  New Client
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
                        <span className="text-muted-foreground">Search for a client...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search by name, phone, or email..."
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
                            No clients found.
                            <Button
                              variant="link"
                              className="block mx-auto mt-2"
                              onClick={() => {
                                setClientTab("new");
                                setClientPopoverOpen(false);
                              }}
                            >
                              Create new client
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
                                          ? "Banned"
                                          : "Suspended"}
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
                        {selectedClient.completedAppointments} completed
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
                  <Label htmlFor="client-name">Name *</Label>
                  <Input
                    id="client-name"
                    placeholder="Client's full name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="client@email.com (optional)"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Phone *</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {isValid && selectedServiceOption && (
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <p className="text-sm font-medium">Appointment Preview</p>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Service:</span>{" "}
                  {selectedServiceOption.title}
                </p>
                <p>
                  <span className="text-muted-foreground">Client:</span>{" "}
                  {clientTab === "existing" ? selectedClient?.name : newClientName}
                </p>
                <p>
                  <span className="text-muted-foreground">Time:</span>{" "}
                  {selectedDate &&
                    format(
                      new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate(),
                        parseInt(appointmentTime.split(":")[0]),
                        parseInt(appointmentTime.split(":")[1])
                      ),
                      "h:mm a"
                    )}{" "}
                  ({selectedServiceOption.duration} min)
                </p>
                {isAdmin && selectedProvider && (
                  <p>
                    <span className="text-muted-foreground">Provider:</span>{" "}
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
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !isValid}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Appointment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
