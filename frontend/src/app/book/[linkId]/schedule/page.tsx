"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { format, addDays, addMonths, startOfDay, parseISO } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useLocale } from "@/components/providers/locale-provider";
import { publicApi } from "@/lib/api";
import { trackAppointmentBooked } from "@/lib/analytics";
import { PublicBookingLink, AvailableSlot, ServiceOption, Provider } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";
import {
  BookingStep,
  StepConfig,
  AnimatedStep,
  StepIndicator,
  ProviderSelectionStep,
  DateTimeSelectionStep,
  ClientInfoStep,
  ServiceHeader,
} from "@/components/booking/schedule";

export default function SchedulePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('booking');
  const common = useTranslations('common');
  
  // Locale for date formatting
  const { locale } = useLocale();
  const dateLocale = locale === "tr" ? tr : enUS;

  const slug = params.linkId as string;
  const serviceId = searchParams.get("service");

  // Booking link and service state
  const [bookingLink, setBookingLink] = useState<PublicBookingLink | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Date and slot state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Provider selection state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerSelectionEnabled, setProviderSelectionEnabled] = useState(false);

  // Available dates state
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [availableDatesLoading, setAvailableDatesLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Client form state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  // Step management state
  const [currentStep, setCurrentStep] = useState<BookingStep>('provider');
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');

  // Calculate date range for calendar
  const today = startOfDay(new Date());
  const maxDate = bookingLink?.user?.settings?.maxAdvanceBookingDays
    ? addDays(today, bookingLink.user.settings.maxAdvanceBookingDays)
    : addDays(today, 30);

  // Determine which steps are needed based on settings
  const bookingSteps = useMemo((): StepConfig[] => {
    const steps: StepConfig[] = [];
    
    if (providerSelectionEnabled && providers.length > 0) {
      steps.push({ 
        key: 'provider', 
        label: t('selectProvider') || 'Select Provider',
        completed: !!selectedProvider 
      });
    }
    
    steps.push({ 
      key: 'datetime', 
      label: t('selectDateTime') || 'Select Date & Time',
      completed: !!selectedSlot 
    });
    
    steps.push({ 
      key: 'info', 
      label: t('yourInformation') || 'Your Information',
      completed: false 
    });
    
    return steps;
  }, [providerSelectionEnabled, providers.length, selectedProvider, selectedSlot, t]);

  // Set initial step based on whether provider selection is needed
  useEffect(() => {
    if (!loading && !providersLoading) {
      if (providerSelectionEnabled && providers.length > 0) {
        setCurrentStep('provider');
      } else {
        setCurrentStep('datetime');
      }
    }
  }, [loading, providersLoading, providerSelectionEnabled, providers.length]);

  // Step navigation functions
  const goToStep = (step: BookingStep) => {
    const currentIndex = bookingSteps.findIndex(s => s.key === currentStep);
    const targetIndex = bookingSteps.findIndex(s => s.key === step);
    setStepDirection(targetIndex > currentIndex ? 'forward' : 'backward');
    setCurrentStep(step);
  };

  const goToNextStep = () => {
    const currentIndex = bookingSteps.findIndex(s => s.key === currentStep);
    if (currentIndex < bookingSteps.length - 1) {
      setStepDirection('forward');
      setCurrentStep(bookingSteps[currentIndex + 1].key);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = bookingSteps.findIndex(s => s.key === currentStep);
    if (currentIndex > 0) {
      setStepDirection('backward');
      setCurrentStep(bookingSteps[currentIndex - 1].key);
    }
  };

  // Fetch booking link and providers
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
      } catch (err: unknown) {
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
  }, [slug, serviceId, toast, common, t]);

  // Fetch available dates when month, provider or service changes
  const fetchAvailableDates = useCallback(async (month: Date) => {
    if (!selectedService || !bookingLink) return;
    if (providerSelectionEnabled && !selectedProvider) return;

    setAvailableDatesLoading(true);
    try {
      const currentMonthStr = format(month, "yyyy-MM");
      const nextMonthStr = format(addMonths(month, 1), "yyyy-MM");
      
      const [currentRes, nextRes] = await Promise.all([
        publicApi.getAvailableDates(
          slug,
          selectedService.id,
          currentMonthStr,
          selectedProvider?.id
        ),
        publicApi.getAvailableDates(
          slug,
          selectedService.id,
          nextMonthStr,
          selectedProvider?.id
        ),
      ]);
      
      const allDates = new Set([
        ...(currentRes.data.availableDates || []),
        ...(nextRes.data.availableDates || []),
      ]);
      setAvailableDates(allDates);
    } catch (err) {
      console.error("Failed to fetch available dates", err);
      setAvailableDates(new Set());
    } finally {
      setAvailableDatesLoading(false);
    }
  }, [slug, selectedService, selectedProvider, bookingLink, providerSelectionEnabled]);

  useEffect(() => {
    if (selectedService && bookingLink) {
      if (!providerSelectionEnabled || selectedProvider) {
        fetchAvailableDates(currentMonth);
      }
    }
  }, [selectedService, bookingLink, selectedProvider, currentMonth, providerSelectionEnabled, fetchAvailableDates]);

  // Auto-select today's date if available
  useEffect(() => {
    if (availableDates.size > 0 && !selectedDate && !availableDatesLoading) {
      const todayDate = startOfDay(new Date());
      const todayStr = format(todayDate, "yyyy-MM-dd");
      if (availableDates.has(todayStr)) {
        setSelectedDate(todayDate);
      }
    }
  }, [availableDates, availableDatesLoading, selectedDate]);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService || !bookingLink) return;
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
      } catch (err: unknown) {
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
  }, [selectedDate, selectedService, selectedProvider, bookingLink, slug, providerSelectionEnabled, toast, common, t]);

  // Handle provider selection
  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setSelectedSlot(null);
  };

  // Handle booking submission
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

      trackAppointmentBooked({
        serviceId: selectedService.id,
        serviceName: selectedService.title,
        organizationId: bookingLink?.organizationId,
        organizationName: bookingLink?.user?.businessName,
        bookingLinkSlug: slug,
        providerId: selectedProvider?.id,
        appointmentDate: format(parseISO(selectedSlot.startTime), "yyyy-MM-dd"),
      });

      router.push(`/book/${slug}/success`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast({
        title: t('bookingFailed'),
        description: error.response?.data?.message || t('bookingError'),
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
  };

  // Loading state
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

  // No service selected state
  if (!selectedService) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 md:p-6">
        <Card className="max-w-md w-full animate-in fade-in-0 zoom-in-95 duration-300">
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
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Back button - only on first step */}
        {currentStep === bookingSteps[0]?.key && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 animate-in fade-in-0 slide-in-from-left-4 duration-300"
            onClick={() => router.push(`/book/${slug}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToServices')}
          </Button>
        )}

        {/* Selected service header */}
        <ServiceHeader service={selectedService} />

      
        {/* Step Content Container */}
        <div className="flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px]">
          
          {/* Provider Selection Step */}
          <AnimatedStep isActive={currentStep === 'provider'} direction={stepDirection}>
            <ProviderSelectionStep
              providers={providers}
              selectedProvider={selectedProvider}
              providersLoading={providersLoading}
              onSelectProvider={handleSelectProvider}
              onContinue={goToNextStep}
              bookingLink={bookingLink}
            />
          </AnimatedStep>

          {/* Date & Time Selection Step */}
          <AnimatedStep isActive={currentStep === 'datetime'} direction={stepDirection}>
            <DateTimeSelectionStep
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              slots={slots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              slotsLoading={slotsLoading}
              availableDates={availableDates}
              availableDatesLoading={availableDatesLoading}
              providerSelectionEnabled={providerSelectionEnabled}
              selectedProvider={selectedProvider}
              selectedService={selectedService}
              bookingLink={bookingLink}
              today={today}
              maxDate={maxDate}
              dateLocale={dateLocale}
              showBackButton={bookingSteps[0]?.key === 'provider'}
              onBack={goToPreviousStep}
              onContinue={goToNextStep}
            />
          </AnimatedStep>

          {/* Client Information Step */}
          <AnimatedStep isActive={currentStep === 'info'} direction={stepDirection}>
            <ClientInfoStep
              clientName={clientName}
              setClientName={setClientName}
              clientPhone={clientPhone}
              setClientPhone={setClientPhone}
              clientEmail={clientEmail}
              setClientEmail={setClientEmail}
              selectedService={selectedService}
              selectedProvider={selectedProvider}
              selectedSlot={selectedSlot}
              dateLocale={dateLocale}
              booking={booking}
              onBack={goToPreviousStep}
              onSubmit={handleBook}
            />
          </AnimatedStep>
        </div>
      </div>
    </div>
  );
}
