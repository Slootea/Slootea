"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { format, addDays, startOfDay, isSameDay, parseISO } from "date-fns";
import { publicApi } from "@/lib/api";
import { PublicBookingLink, AvailableSlot, ServiceOption } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";

export default function SchedulePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

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
        }
      } catch (err: any) {
        toast({
          title: "Error",
          description: "Failed to load booking information",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchBookingLink();
  }, [slug, serviceId]);

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
          title: "Error",
          description: "Failed to load available slots",
          variant: "destructive",
        });
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedService, bookingLink, slug]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedService) return;

    if (!clientName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!clientPhone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number",
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
      });

      toast({
        title: "Booking Confirmed!",
        description: "Your appointment has been scheduled successfully",
      });

      // Redirect to success or back to service selection
      router.push(`/book/${slug}/success`);
    } catch (err: any) {
      toast({
        title: "Booking Failed",
        description: err.response?.data?.message || "Unable to complete booking",
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
      <div className="min-h-screen bg-gray-50 p-6">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Please select a service first
            </p>
            <Button onClick={() => router.push(`/book/${slug}`)}>
              Select Service
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push(`/book/${slug}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Services
        </Button>

        {/* Selected service info */}
        <Card className="mb-6">
          <CardContent className="p-4 flex items-center gap-4">
            {selectedService.imageUrl ? (
              <img
                src={selectedService.imageUrl}
                alt={selectedService.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                <CalendarIcon className="h-8 w-8 text-gray-300" />
              </div>
            )}
            <div>
              <h2 className="font-semibold">{selectedService.title}</h2>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {selectedService.duration} minutes
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) =>
                  date < today || date > maxDate
                }
                className="rounded-md border w-full"
              />
            </CardContent>
          </Card>

          {/* Time Slots & Form */}
          <div className="space-y-6">
            {/* Time Slots */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate
                    ? `Available Times - ${format(selectedDate, "MMM d, yyyy")}`
                    : "Select a Date First"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Please select a date to see available times
                  </p>
                ) : slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No available times on this date
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
                  <CardTitle className="text-lg">Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Your full name"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="+1 234 567 8900"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email (optional)</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    <p className="font-medium">Appointment Summary</p>
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
                        Booking...
                      </>
                    ) : (
                      "Confirm Booking"
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
