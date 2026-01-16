"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { publicApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  User,
  Building,
  Loader2,
} from "lucide-react";

interface AppointmentDetails {
  id: string;
  startTime: string;
  endTime: string;
  clientName: string;
  status: string;
  confirmed: boolean;
  serviceOption: {
    title: string;
    duration: number;
  };
  user: {
    businessName: string;
  };
}

export default function ConfirmPage() {
  const params = useParams();
  const { toast } = useToast();
  const token = params.token as string;

  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await publicApi.getAppointmentByToken(token);
        setAppointment(res.data);
        setConfirmed(res.data.confirmed);
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Unable to load appointment details"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchAppointment();
  }, [token]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await publicApi.confirmAppointment(token);
      setConfirmed(true);
      toast({
        title: "Confirmed!",
        description: "Your attendance has been confirmed",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to confirm",
        variant: "destructive",
      });
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Link Invalid</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (appointment?.status === "cancelled") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Appointment Cancelled</h1>
            <p className="text-muted-foreground">
              This appointment has been cancelled and is no longer valid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {confirmed ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Attendance Confirmed!</CardTitle>
            </>
          ) : (
            <>
              <Calendar className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Confirm Your Attendance</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Appointment Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{appointment?.user?.businessName}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment?.serviceOption?.title}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {appointment?.startTime &&
                    format(parseISO(appointment.startTime), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {appointment?.startTime &&
                    format(parseISO(appointment.startTime), "h:mm a")}{" "}
                  -{" "}
                  {appointment?.endTime &&
                    format(parseISO(appointment.endTime), "h:mm a")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment?.serviceOption?.duration} minutes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{appointment?.clientName}</p>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          {!confirmed && (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                Please confirm that you will attend this appointment. If you
                don't confirm, your slot may be released to other clients.
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Yes, I Will Attend
                  </>
                )}
              </Button>
            </>
          )}

          {confirmed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 text-center">
              Thank you for confirming! We look forward to seeing you.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
