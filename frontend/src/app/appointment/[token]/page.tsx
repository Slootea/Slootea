"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO, addMonths, startOfMonth } from "date-fns";
import { useTranslations } from "next-intl";
import { publicApi } from "@/lib/api";
import { PublicAppointmentDetails, AppointmentStatus, TimeSlot } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Clock,
  User,
  Building,
  Loader2,
  Edit2,
  Trash2,
  Phone,
  Mail,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

export default function AppointmentManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('appointment');
  const common = useTranslations('common');
  const token = params.token as string;

  const [appointment, setAppointment] = useState<PublicAppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  
  // Edit mode state
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  
  // Reschedule state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);

  const fetchAppointment = useCallback(async () => {
    try {
      const res = await publicApi.getAppointmentForManagement(token);
      setAppointment(res.data);
      // Check if we need to show confirmation dialog
      if (res.data.status === AppointmentStatus.CONFIRMED) {
        setConfirmed(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load appointment");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  // Load available dates when reschedule dialog opens
  useEffect(() => {
    const loadAvailableDates = async () => {
      if (!showRescheduleDialog || !appointment) return;
      
      setLoadingDates(true);
      try {
        const currentMonth = format(new Date(), "yyyy-MM");
        const nextMonth = format(addMonths(new Date(), 1), "yyyy-MM");
        
        const [currentRes, nextRes] = await Promise.all([
          publicApi.getAvailableDatesForReschedule(token, currentMonth),
          publicApi.getAvailableDatesForReschedule(token, nextMonth),
        ]);
        
        setAvailableDates([
          ...currentRes.data.availableDates,
          ...nextRes.data.availableDates,
        ]);
      } catch (err) {
        console.error("Failed to load available dates", err);
      } finally {
        setLoadingDates(false);
      }
    };
    
    loadAvailableDates();
  }, [showRescheduleDialog, appointment, token]);

  // Load slots when date is selected
  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedDate) return;
      
      setLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const res = await publicApi.getAvailableSlotsForReschedule(token, dateStr);
        setAvailableSlots(res.data);
      } catch (err) {
        console.error("Failed to load slots", err);
        toast({
          title: "Failed to load time slots",
          variant: "destructive",
        });
      } finally {
        setLoadingSlots(false);
      }
    };
    
    loadSlots();
  }, [selectedDate, token, toast]);

  const handleConfirmAttendance = async () => {
    setConfirming(true);
    try {
      await publicApi.confirmAppointment(token);
      setConfirmed(true);
      setShowConfirmDialog(false);
      toast({
        title: t('confirmed') || "Attendance Confirmed",
        description: t('confirmSuccess') || "Thank you for confirming your appointment!",
      });
      await fetchAppointment();
    } catch (err: any) {
      toast({
        title: common('error') || "Error",
        description: err.response?.data?.message || "Failed to confirm appointment",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await publicApi.cancelAppointmentByToken(token, cancelReason || undefined);
      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled.",
      });
      setShowCancelDialog(false);
      await fetchAppointment();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) return;
    
    setRescheduling(true);
    try {
      await publicApi.updateAppointmentByToken(token, {
        startTime: selectedSlot,
      });
      toast({
        title: "Appointment Rescheduled",
        description: "Your appointment has been updated to the new time.",
      });
      setShowRescheduleDialog(false);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      await fetchAppointment();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to reschedule appointment",
        variant: "destructive",
      });
    } finally {
      setRescheduling(false);
    }
  };

  const isDateAvailable = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availableDates.includes(dateStr);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-6">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  const isCancelled = appointment.status === AppointmentStatus.CANCELLED;
  const isCompleted = appointment.status === AppointmentStatus.COMPLETED;
  const isPast = new Date(appointment.startTime) < new Date();

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          {isCancelled ? (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Appointment Cancelled</CardTitle>
              <CardDescription>This appointment has been cancelled.</CardDescription>
            </>
          ) : isCompleted ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Appointment Completed</CardTitle>
              <CardDescription>Thank you for your visit!</CardDescription>
            </>
          ) : (
            <>
              <CalendarIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Your Appointment</CardTitle>
              <CardDescription>View and manage your appointment details</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Appointment Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {appointment.user?.businessName || 
                    (appointment.user?.firstName ? `${appointment.user.firstName} ${appointment.user.lastName || ''}` : 'Provider')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.serviceOption?.title}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {format(parseISO(appointment.startTime), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {format(parseISO(appointment.startTime), "h:mm a")} -{" "}
                  {format(parseISO(appointment.endTime), "h:mm a")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.serviceOption?.duration} minutes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{appointment.clientName}</p>
                {appointment.clientEmail && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {appointment.clientEmail}
                  </p>
                )}
                {appointment.clientPhone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {appointment.clientPhone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`
              px-3 py-1 rounded-full text-sm font-medium
              ${isCancelled ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : ''}
              ${isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : ''}
              ${appointment.status === AppointmentStatus.CONFIRMED ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' : ''}
              ${appointment.status === AppointmentStatus.PENDING_CONFIRMATION ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200' : ''}
            `}>
              {appointment.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>

          {/* Confirm Attendance Button (for reminders) */}
          {!isCancelled && !isCompleted && !isPast && appointment.status === AppointmentStatus.PENDING_CONFIRMATION && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    Confirmation Required
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Please confirm that you will attend this appointment.
                  </p>
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirm Attendance
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isCancelled && !isCompleted && !isPast && (
            <div className="flex flex-col gap-3 pt-4 border-t">
              {appointment.canModify && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRescheduleDialog(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Reschedule Appointment
                </Button>
              )}
              
              {appointment.canCancel && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel Appointment
                </Button>
              )}

              {!appointment.canModify && appointment.canCancel && (
                <p className="text-xs text-center text-muted-foreground">
                  Appointments can only be rescheduled at least {appointment.cancellationPolicy || '24 hours'} in advance.
                </p>
              )}
            </div>
          )}

          {/* Cancellation Policy */}
          {appointment.cancellationPolicy && !isCancelled && !isCompleted && (
            <div className="text-xs text-center text-muted-foreground border-t pt-4">
              <p className="font-medium">Cancellation Policy</p>
              <p>{appointment.cancellationPolicy}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Attendance Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Attendance</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm that you will attend your appointment on{" "}
              <strong>
                {appointment && format(parseISO(appointment.startTime), "EEEE, MMMM d 'at' h:mm a")}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAttendance} disabled={confirming}>
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Yes, I'll Attend
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Select a new date and time for your appointment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingDates ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => !isDateAvailable(date)}
                className="rounded-md border mx-auto"
              />
            )}
            
            {selectedDate && (
              <div className="space-y-2">
                <Label>Available Times</Label>
                {loadingSlots ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No available slots for this date.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.startTime}
                        variant={selectedSlot === slot.startTime ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className="text-xs"
                      >
                        {format(parseISO(slot.startTime), "h:mm a")}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!selectedSlot || rescheduling}
            >
              {rescheduling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                "Confirm New Time"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="cancelReason">Reason (optional)</Label>
            <Textarea
              id="cancelReason"
              placeholder="Please let us know why you're cancelling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Appointment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
