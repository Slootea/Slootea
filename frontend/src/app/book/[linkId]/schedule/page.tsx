"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { format, addDays, startOfDay, isSameDay, parseISO, isBefore, isAfter } from "date-fns";
import { useTranslations } from "next-intl";
import { publicApi } from "@/lib/api";
import { PublicBookingLink, AvailableSlot, ServiceOption, Provider } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Loader2,
  Users,
  Check,
} from "lucide-react";

export default function SchedulePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('booking');
  const common = useTranslations('common');

  const slug = params.linkId as string;
  const serviceId = searchParams.get("service");

  const [bookingLink, setBookingLink] = useState<PublicBookingLink | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Provider selection
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerSelectionEnabled, setProviderSelectionEnabled] = useState(false);

  // Available dates
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [availableDatesLoading, setAvailableDatesLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Client form
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  useEffect(() => {
    const fetchBookingLink = async () => {
      try {
        const res = await publicApi.getBookingLink(slug);
        setBookingLink(res.data);

        if (serviceId) {
          const service = res.data.serviceOptions.find(
            (s: ServiceOption) => s.id === serviceId
          );
          setSelectedService(service || null);

          // Fetch providers if provider selection mode is 'client_chooses'
          if (res.data.settings?.providerSelectionMode === 'client_chooses') {
            setProvidersLoading(true);
            try {
              const providersRes = await publicApi.getProviders(slug, serviceId);
              setProviders(providersRes.data.providers || []);
              setProviderSelectionEnabled(providersRes.data.providerSelectionEnabled);
            } catch (err) {
              console.error("Failed to fetch providers", err);
            } finally {
              setProvidersLoading(false);
            }
          }
        }
      } catch (err: any) {
        toast({
          title: common('error'),
          description: t('failedToLoad'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchBookingLink();
  }, [slug, serviceId]);

  // Fetch available dates when month, provider or service changes
  const fetchAvailableDates = useCallback(async (month: Date) => {
    if (!selectedService || !bookingLink) return;
    // If provider selection is enabled but no provider selected, don't fetch yet
    if (providerSelectionEnabled && !selectedProvider) return;

    setAvailableDatesLoading(true);
    try {
      const monthStr = format(month, "yyyy-MM");
      const res = await publicApi.getAvailableDates(
        slug,
        selectedService.id,
        monthStr,
        selectedProvider?.id
      );
      setAvailableDates(new Set(res.data.availableDates || []));
    } catch (err) {
      console.error("Failed to fetch available dates", err);
      setAvailableDates(new Set());
    } finally {
      setAvailableDatesLoading(false);
    }
  }, [slug, selectedService, selectedProvider, bookingLink, providerSelectionEnabled]);

  useEffect(() => {
    if (selectedService && bookingLink) {
      // Only fetch if provider selection is not required, or provider is selected
      if (!providerSelectionEnabled || selectedProvider) {
        fetchAvailableDates(currentMonth);
      }
    }
  }, [selectedService, bookingLink, selectedProvider, currentMonth, providerSelectionEnabled, fetchAvailableDates]);

  useEffect(() => {
    if (!selectedDate || !selectedService || !bookingLink) return;
    // If provider selection is enabled but no provider selected, don't fetch slots yet
    if (providerSelectionEnabled && !selectedProvider) return;

    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await publicApi.getAvailableSlots(
          slug, 
          selectedService.id, 
          dateStr,
          selectedProvider?.id
        );
        setSlots(res.data);
      } catch (err: any) {
        toast({
          title: common('error'),
          description: t('failedToLoadSlots'),
          variant: "destructive",
        });
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedService, selectedProvider, bookingLink, slug, providerSelectionEnabled]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedService) return;

    if (!clientName.trim()) {
      toast({
        title: t('nameRequired'),
        description: t('pleaseEnterName'),
        variant: "destructive",
      });
      return;
    }

    if (!clientPhone.trim()) {
      toast({
        title: t('phoneRequired'),
        description: t('pleaseEnterPhone'),
        variant: "destructive",
      });
      return;
    }

    setBooking(true);
    try {
      await publicApi.bookAppointment(slug, {
        serviceOptionId: selectedService.id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        providerId: selectedProvider?.id,
      });

      toast({
        title: t('bookingConfirmed'),
        description: t('bookingSuccess'),
      });

      // Redirect to success or back to service selection
      router.push(`/book/${slug}/success`);
    } catch (err: any) {
      toast({
        title: t('bookingFailed'),
        description: err.response?.data?.message || t('bookingError'),
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
  };

  // Calculate date range for calendar
  const today = startOfDay(new Date());
  const maxDate = bookingLink?.user?.settings?.maxAdvanceBookingDays
    ? addDays(today, bookingLink.user.settings.maxAdvanceBookingDays)
    : addDays(today, 30);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!selectedService) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              {t('selectServiceFirst')}
            </p>
            <Button onClick={() => router.push(`/book/${slug}`)}>
              {t('selectService')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto p-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push(`/book/${slug}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('backToServices')}
        </Button>

        {/* Selected service info */}
        <Card className="mb-6">
          <CardContent className="p-4 flex items-center gap-4">
            {selectedService.imageBase64 ? (
              <img
                src={selectedService.imageBase64}
                alt={selectedService.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            <div>
              <h2 className="font-semibold">{selectedService.title}</h2>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {selectedService.duration} {t('minutes')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Provider Selection - shown when providerSelectionEnabled */}
        {providerSelectionEnabled && providers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('selectProvider') || 'Select Your Provider'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {providersLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {providers.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setSelectedProvider(provider);
                        setSelectedSlot(null); // Reset slot when provider changes
                      }}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        selectedProvider?.id === provider.id
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      {selectedProvider?.id === provider.id && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <Avatar className="h-12 w-12 mx-auto mb-2">
                        <AvatarImage src={provider.imageUrl} />
                        <AvatarFallback>
                          {provider.firstName?.[0] || ''}{provider.lastName?.[0] || ''}
                          {!provider.firstName && !provider.lastName && <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium text-center truncate">
                        {provider.firstName || provider.lastName 
                          ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim()
                          : t('provider') || 'Provider'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {!selectedProvider && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  {t('pleaseSelectProvider') || 'Please select a provider to continue'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('selectDate')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                disabled={(date) => {
                  // Disable past dates and dates beyond max booking window
                  if (isBefore(date, today) || isAfter(date, maxDate)) {
                    return true;
                  }
                  // If provider selection is enabled but no provider selected, disable all
                  if (providerSelectionEnabled && !selectedProvider) {
                    return true;
                  }
                  // Disable dates that have no available slots
                  const dateStr = format(date, "yyyy-MM-dd");
                  return !availableDates.has(dateStr);
                }}
                modifiers={{
                  available: (date) => {
                    if (isBefore(date, today) || isAfter(date, maxDate)) return false;
                    if (providerSelectionEnabled && !selectedProvider) return false;
                    const dateStr = format(date, "yyyy-MM-dd");
                    return availableDates.has(dateStr);
                  },
                }}
                modifiersClassNames={{
                  available: "bg-primary/10 font-semibold text-primary hover:bg-primary/20",
                }}
                className="rounded-md border w-full"
              />
              {availableDatesLoading && (
                <div className="flex items-center justify-center text-sm text-muted-foreground mt-2">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('loadingAvailability') || 'Loading availability...'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Slots & Form */}
          <div className="space-y-6">
            {/* Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate
                    ? `${t('availableTimes')} - ${format(selectedDate, "MMM d, yyyy")}`
                    : t('selectDate')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {providerSelectionEnabled && !selectedProvider ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('selectProviderFirst') || 'Please select a provider first'}
                  </p>
                ) : !selectedDate ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('selectDateFirst')}
                  </p>
                ) : slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('noAvailableTimes')}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {slots.map((slot, index) => (
                      <Button
                        key={index}
                        variant={selectedSlot === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {format(parseISO(slot.startTime), "HH:mm")}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Client Info Form */}
            {selectedSlot && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('yourInformation')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('name')} *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder={t('namePlaceholder')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">{t('phone')} *</Label>
                    <PhoneInput
                      id="phone"
                      value={clientPhone}
                      onChange={(value) => setClientPhone(value || "")}
                      placeholder={t('phonePlaceholder')}
                      defaultCountry="TR"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">{t('emailOptional')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <p className="font-medium">{t('appointmentSummary')}</p>
                    <p className="text-muted-foreground">
                      {selectedService.title}
                    </p>
                    <p className="text-muted-foreground">
                      {format(parseISO(selectedSlot.startTime), "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-muted-foreground">
                      {format(parseISO(selectedSlot.startTime), "h:mm a")} -{" "}
                      {format(parseISO(selectedSlot.endTime), "h:mm a")}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleBook}
                    disabled={booking}
                  >
                    {booking ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('bookingInProgress')}
                      </>
                    ) : (
                      t('confirmBooking')
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
