"use client";

import { useEffect, useState, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { publicApi, publicGamificationApi, publicVirtualPetApi } from "@/lib/api";
import {
  PublicBookingLink,
  ServiceOption,
  GamificationStatus,
  ClientLookupResult,
  ReferralValidation,
  AvailableSlot,
  SpinWheelResult,
  VirtualPetStatus,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { format, addDays, startOfDay, parseISO } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  Image,
  Loader2,
  Sparkles,
  Gift,
  CheckCircle,
} from "lucide-react";
import { GamificationCard, MiniGamificationCard } from "@/components/gamification/gamification-card";
import { ReferralInput } from "@/components/gamification/referral-input";
import { SpinWheel } from "@/components/gamification/spin-wheel";
import { VirtualPetWidget } from "@/components/gamification/virtual-pet";

// Simple animation wrapper (replace with framer-motion when installed)
const MotionDiv = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`animate-in fade-in-0 slide-in-from-bottom-4 duration-300 ${className || ''}`}>
    {children}
  </div>
);

type BookingStep = 
  | "info"           // Enter name, phone, email
  | "referral"       // Enter referral code (if new client)
  | "service"        // Select service
  | "schedule"       // Select date/time
  | "confirm"        // Confirm booking
  | "success"        // Booking success + spin wheel
  | "gamification";  // View gamification status after booking

export default function GamifiedBookingPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('booking');
  const common = useTranslations('common');
  const slug = params.linkId as string;

  // Loading states
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  // Data states
  const [bookingLink, setBookingLink] = useState<PublicBookingLink | null>(null);
  const [gamificationStatus, setGamificationStatus] = useState<GamificationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Booking flow state
  const [step, setStep] = useState<BookingStep>("info");
  const [clientLookup, setClientLookup] = useState<ClientLookupResult | null>(null);
  const [referralValidation, setReferralValidation] = useState<ReferralValidation | null>(null);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // Success state
  const [bookedAppointmentId, setBookedAppointmentId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [virtualPetEnabled, setVirtualPetEnabled] = useState(false);

  // Load booking link and gamification status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [linkRes, gamRes, petRes] = await Promise.all([
          publicApi.getBookingLink(slug),
          publicGamificationApi.getStatus(slug).catch(() => ({ data: { enabled: false } })),
          publicVirtualPetApi.getStatus(slug).catch(() => ({ data: { enabled: false } })),
        ]);
        setBookingLink(linkRes.data);
        setGamificationStatus(gamRes.data);
        setVirtualPetEnabled(petRes.data.enabled);
      } catch (err: any) {
        setError(err.response?.data?.message || "This booking link is not available");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService || !bookingLink) return;

    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await publicApi.getAvailableSlots(slug, selectedService.id, dateStr);
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
  }, [selectedDate, selectedService, bookingLink, slug]);

  // Look up existing client by phone
  const handlePhoneBlur = async () => {
    if (!clientPhone || clientPhone.length < 8) return;
    
    if (gamificationStatus?.enabled) {
      try {
        const res = await publicGamificationApi.lookupClient(slug, clientPhone);
        const lookup = res.data as ClientLookupResult;
        setClientLookup(lookup);
        
        if (lookup.found && lookup.client) {
          setClientName(lookup.client.name);
          setClientEmail(lookup.client.email || "");
          if (lookup.gamification) {
            setClientId(lookup.client.id);
          }
        }
      } catch (error) {
        console.error("Client lookup failed", error);
      }
    }
  };

  // Handle step 1: Client info
  const handleInfoSubmit = () => {
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

    // If gamification is enabled and client is new, show referral step
    if (gamificationStatus?.enabled && !clientLookup?.found) {
      setStep("referral");
    } else {
      setStep("service");
    }
  };

  // Handle referral step
  const handleReferralValidated = (validation: ReferralValidation) => {
    setReferralValidation(validation);
    setStep("service");
  };

  // Handle service selection
  const handleSelectService = (service: ServiceOption) => {
    setSelectedService(service);
    setStep("schedule");
  };

  // Handle slot selection
  const handleSelectSlot = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedService) return;

    setBooking(true);
    try {
      const bookingData: any = {
        serviceOptionId: selectedService.id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
      };

      // Add referral code if validated
      if (referralValidation?.valid) {
        bookingData.referralCode = referralValidation;
      }

      const res = await publicApi.bookAppointment(slug, bookingData);
      
      // Get client ID from response if available
      if (res.data.clientId) {
        setClientId(res.data.clientId);
      }
      
      setBookedAppointmentId(res.data.id);
      
      toast({
        title: t('bookingConfirmed'),
        description: t('bookingSuccess'),
      });

      // Move to success step
      setStep("success");
      
      // Show spin wheel if gamification is enabled
      if (gamificationStatus?.enabled && gamificationStatus.spinWheelEnabled) {
        setShowSpinWheel(true);
      }
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

  // Handle spin wheel completion
  const handleSpinComplete = (result: SpinWheelResult) => {
    setShowSpinWheel(false);
    setStep("gamification");
  };

  // Calculate date range
  const today = startOfDay(new Date());
  const maxDate = bookingLink?.user?.settings?.maxAdvanceBookingDays
    ? addDays(today, bookingLink.user.settings.maxAdvanceBookingDays)
    : addDays(today, 30);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <CalendarIcon className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('linkNotAvailable')}</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {bookingLink?.user?.businessName || t('title')}
          </h1>
          {gamificationStatus?.enabled && (
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
              <Sparkles className="h-4 w-4" />
              Earn rewards with every booking!
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {step !== "success" && step !== "gamification" && (
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {["info", "service", "schedule", "confirm"].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === s
                        ? "bg-primary text-primary-foreground"
                        : ["info", "referral"].includes(step) && i > 0
                        ? "bg-muted text-muted-foreground"
                        : step === "service" && i > 1
                        ? "bg-muted text-muted-foreground"
                        : step === "schedule" && i > 2
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 3 && (
                    <div
                      className={`w-12 h-1 mx-1 ${
                        (step === "service" && i === 0) ||
                        (step === "schedule" && i <= 1) ||
                        (step === "confirm" && i <= 2)
                          ? "bg-primary/50"
                          : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gamification Mini Card for returning clients */}
        {clientLookup?.found && clientLookup.gamification && step !== "success" && step !== "gamification" && (
          <div className="mb-6">
            <MiniGamificationCard gamification={clientLookup.gamification} />
          </div>
        )}

        <div>
          {/* Step 1: Client Information */}
          {step === "info" && (
            <MotionDiv>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('yourInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('phone')} *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        onBlur={handlePhoneBlur}
                        placeholder={t('phonePlaceholder')}
                        className="pl-10"
                      />
                    </div>
                    {gamificationStatus?.enabled && (
                      <p className="text-xs text-muted-foreground">
                        We'll check if you have an existing rewards account
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
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

                  <div className="space-y-2">
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

                  {clientLookup?.found && (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-3 rounded-lg text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Welcome back! Your info has been pre-filled.
                    </div>
                  )}

                  <Button onClick={handleInfoSubmit} className="w-full">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </MotionDiv>
          )}

          {/* Step 2: Referral Code (for new clients) */}
          {step === "referral" && gamificationStatus && (
            <MotionDiv>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep("info")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <ReferralInput
                slug={slug}
                gamificationStatus={gamificationStatus}
                clientPhone={clientPhone}
                onReferralValidated={handleReferralValidated}
                onSkip={() => setStep("service")}
              />
            </MotionDiv>
          )}

          {/* Step 3: Service Selection */}
          {step === "service" && (
            <MotionDiv>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep(clientLookup?.found ? "info" : "referral")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <h2 className="text-xl font-semibold mb-4">{t('selectService')}</h2>

              {bookingLink?.serviceOptions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">{t('noServicesAvailable')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {bookingLink?.serviceOptions.map((option) => (
                    <Card
                      key={option.id}
                      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                      onClick={() => handleSelectService(option)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        {option.imageBase64 ? (
                          <img
                            src={option.imageBase64}
                            alt={option.title}
                            className="w-20 h-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                            <Image className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{option.title}</h3>
                          {option.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {option.description}
                            </p>
                          )}
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <Clock className="h-4 w-4 mr-1" />
                            {option.duration} {t('minutes')}
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </MotionDiv>
          )}

          {/* Step 4: Schedule Selection */}
          {step === "schedule" && selectedService && (
            <MotionDiv>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep("service")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {/* Selected service mini card */}
              <Card className="mb-4">
                <CardContent className="p-3 flex items-center gap-3">
                  {selectedService.imageUrl ? (
                    <img
                      src={selectedService.imageUrl}
                      alt={selectedService.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <CalendarIcon className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium">{selectedService.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedService.duration} {t('minutes')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Calendar */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{t('selectDate')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < today || date > maxDate}
                      className="rounded-md border w-full"
                    />
                  </CardContent>
                </Card>

                {/* Time Slots */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {selectedDate
                        ? `${t('availableTimes')} - ${format(selectedDate, "MMM d")}`
                        : t('selectDate')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedDate ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {t('selectDateFirst')}
                      </p>
                    ) : slotsLoading ? (
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <Skeleton key={i} className="h-10" />
                        ))}
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {t('noAvailableTimes')}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {slots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedSlot === slot ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSelectSlot(slot)}
                          >
                            {format(parseISO(slot.startTime), "HH:mm")}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </MotionDiv>
          )}

          {/* Step 5: Confirmation */}
          {step === "confirm" && selectedService && selectedSlot && (
            <MotionDiv>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep("schedule")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <Card>
                <CardHeader>
                  <CardTitle>{t('appointmentSummary')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Service */}
                  <div className="flex items-center gap-3">
                    {selectedService.imageUrl ? (
                      <img
                        src={selectedService.imageUrl}
                        alt={selectedService.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{selectedService.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedService.duration} {t('minutes')}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Date & Time */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {format(parseISO(selectedSlot.startTime), "EEEE, MMMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {format(parseISO(selectedSlot.startTime), "h:mm a")} -{" "}
                      {format(parseISO(selectedSlot.endTime), "h:mm a")}
                    </div>
                  </div>

                  <Separator />

                  {/* Client Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {clientName}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {clientPhone}
                    </div>
                    {clientEmail && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {clientEmail}
                      </div>
                    )}
                  </div>

                  {/* Gamification bonus info */}
                  {gamificationStatus?.enabled && (
                    <>
                      <Separator />
                      <div className="bg-primary/5 rounded-lg p-3 space-y-2">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <Gift className="h-4 w-4 text-primary" />
                          Rewards you'll earn:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                          <li>+{gamificationStatus.pointsPerBooking} points for booking</li>
                          {referralValidation?.valid && (
                            <li className="text-primary">
                              +{referralValidation.bonusPoints} referral bonus points!
                            </li>
                          )}
                          {clientLookup?.gamification?.discountPercentage && clientLookup.gamification.discountPercentage > 0 && (
                            <li className="text-green-600">
                              {clientLookup.gamification.discountPercentage}% member discount applied
                            </li>
                          )}
                        </ul>
                      </div>
                    </>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleConfirmBooking}
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
            </MotionDiv>
          )}

          {/* Step 6: Success + Spin Wheel */}
          {step === "success" && (
            <MotionDiv className="text-center">
              {showSpinWheel && clientId ? (
                <SpinWheel
                  slug={slug}
                  clientId={clientId}
                  onComplete={handleSpinComplete}
                  onSkip={() => {
                    setShowSpinWheel(false);
                    setStep("gamification");
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">{t('bookingConfirmed')}</h2>
                    <p className="text-muted-foreground mb-6">
                      {t('bookingSuccessMessage')}
                    </p>
                    
                    {gamificationStatus?.enabled && gamificationStatus.spinWheelEnabled && clientId && (
                      <Button
                        onClick={() => setShowSpinWheel(true)}
                        className="mb-4"
                        variant="outline"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Spin the Wheel for Rewards!
                      </Button>
                    )}

                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/book/${slug}`)}
                      >
                        {t('bookAnother')}
                      </Button>
                      {gamificationStatus?.enabled && (
                        <Button onClick={() => setStep("gamification")}>
                          View My Rewards
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </MotionDiv>
          )}

          {/* Step 7: Gamification Status */}
          {step === "gamification" && clientLookup?.gamification && (
            <MotionDiv>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">Your Rewards</h2>
                <p className="text-muted-foreground">
                  Keep booking to earn more points and unlock rewards!
                </p>
              </div>

              <div className="space-y-6">
                <GamificationCard
                  gamification={clientLookup.gamification}
                  slug={slug}
                  clientId={clientId!}
                />

                {/* Virtual Pet Section */}
                {virtualPetEnabled && clientId && (
                  <div className="mt-6">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
                        🐾 Your Virtual Pet
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Use your points to care for your pet and watch them grow!
                      </p>
                    </div>
                    <VirtualPetWidget
                      slug={slug}
                      clientId={clientId}
                      clientPoints={clientLookup.gamification.availablePoints}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/book/${slug}`)}
                >
                  {t('bookAnother')}
                </Button>
              </div>
            </MotionDiv>
          )}
        </div>
      </div>
    </div>
  );
}
