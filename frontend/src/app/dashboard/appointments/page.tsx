"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { appointmentsApi, setAuthToken } from "@/lib/api";
import { Appointment, AppointmentStatus, AppointmentStatusLabels } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Clock, User, Mail, Phone, X } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function AppointmentsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchAppointments = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      const res = await appointmentsApi.getAll();
      setAppointments(res.data);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [getToken]);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      await appointmentsApi.cancel(id);
      toast({ title: "Appointment cancelled" });
      fetchAppointments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await appointmentsApi.update(id, { status });
      toast({ title: "Status updated" });
      fetchAppointments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === "all") return true;
    if (filter === "upcoming") {
      return (
        new Date(apt.startTime) >= new Date() &&
        apt.status !== AppointmentStatus.CANCELLED
      );
    }
    return apt.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">
          Manage all your appointments in one place.
        </p>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appointments</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value={AppointmentStatus.PENDING_CONFIRMATION}>
              Pending Confirmation
            </SelectItem>
            <SelectItem value={AppointmentStatus.CONFIRMED}>Confirmed</SelectItem>
            <SelectItem value={AppointmentStatus.COMPLETED}>Completed</SelectItem>
            <SelectItem value={AppointmentStatus.CANCELLED}>Cancelled</SelectItem>
            <SelectItem value={AppointmentStatus.NO_SHOW}>No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredAppointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No appointments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              onCancel={handleCancel}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  onCancel,
  onStatusChange,
}: {
  appointment: Appointment;
  onCancel: (id: string) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
}) {
  const isPast = new Date(appointment.endTime) < new Date();
  const canCancel =
    !isPast &&
    appointment.status !== AppointmentStatus.CANCELLED &&
    appointment.status !== AppointmentStatus.COMPLETED;

  return (
    <Card className={isPast ? "opacity-70" : ""}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">
                {appointment.serviceOption?.title || "Service"}
              </h3>
              <StatusBadge status={appointment.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(parseISO(appointment.startTime), "EEEE, MMMM d, yyyy")}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {format(parseISO(appointment.startTime), "h:mm a")} -{" "}
                {format(parseISO(appointment.endTime), "h:mm a")}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                {appointment.clientName}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {appointment.clientEmail}
              </div>
              {appointment.clientPhone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {appointment.clientPhone}
                </div>
              )}
            </div>

            {appointment.notes && (
              <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                Notes: {appointment.notes}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 min-w-[180px]">
            {!isPast && appointment.status !== AppointmentStatus.CANCELLED && (
              <Select
                value={appointment.status}
                onValueChange={(v) =>
                  onStatusChange(appointment.id, v as AppointmentStatus)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AppointmentStatus.PENDING_CONFIRMATION}>
                    Pending
                  </SelectItem>
                  <SelectItem value={AppointmentStatus.CONFIRMED}>
                    Confirmed
                  </SelectItem>
                  <SelectItem value={AppointmentStatus.COMPLETED}>
                    Completed
                  </SelectItem>
                  <SelectItem value={AppointmentStatus.NO_SHOW}>
                    No Show
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => onCancel(appointment.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending_confirmation: {
      label: "Pending",
      variant: "outline",
    },
    confirmed: {
      label: "Confirmed",
      variant: "default",
    },
    cancelled: {
      label: "Cancelled",
      variant: "destructive",
    },
    completed: {
      label: "Completed",
      variant: "secondary",
    },
    no_show: {
      label: "No Show",
      variant: "outline",
    },
  };

  const config = statusConfig[status] || statusConfig.pending_confirmation;

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
