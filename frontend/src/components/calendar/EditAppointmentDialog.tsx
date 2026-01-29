"use client";

import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, User, Phone, Mail, Pencil, Loader2, XCircle, ExternalLink } from "lucide-react";
import { Appointment, AppointmentStatus } from "@/lib/types";

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  newDate: string;
  setNewDate: (date: string) => void;
  newStartTime: string;
  setNewStartTime: (time: string) => void;
  sendNotification: boolean;
  setSendNotification: (value: boolean) => void;
  saving: boolean;
  onSave: () => void;
  onCancel?: (id: string) => Promise<void>;
  cancelling?: boolean;
}

export function EditAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  newDate,
  setNewDate,
  newStartTime,
  setNewStartTime,
  sendNotification,
  setSendNotification,
  saving,
  onSave,
  onCancel,
  cancelling = false,
}: EditAppointmentDialogProps) {
  const router = useRouter();
  
  const isCancelled = appointment?.status === AppointmentStatus.CANCELLED;
  const isCompleted = appointment?.status === AppointmentStatus.COMPLETED;
  const canCancel = !isCancelled && !isCompleted;
  
  const handleViewClientProfile = () => {
    if (appointment?.clientId) {
      router.push(`/dashboard/clients?highlight=${appointment.clientId}`);
      onOpenChange(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointment || !onCancel) return;
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    await onCancel(appointment.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Appointment
          </DialogTitle>
          <DialogDescription>
            Update the appointment time. The client will be notified of any changes.
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-6 py-4">
            {/* Client Info */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{appointment.clientName}</span>
                <Badge 
                  variant={isCancelled ? "destructive" : "outline"} 
                  className="ml-auto"
                >
                  {appointment.status.replace("_", " ")}
                </Badge>
              </div>
              {appointment.clientId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-primary hover:text-primary/80"
                  onClick={handleViewClientProfile}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Client Profile
                </Button>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {appointment.clientEmail}
              </div>
              {appointment.clientPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {appointment.clientPhone}
                </div>
              )}
              {appointment.serviceOption && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {appointment.serviceOption.title} ({appointment.serviceOption.duration} min)
                </div>
              )}
            </div>

            {/* Current Time */}
            <div>
              <Label className="text-muted-foreground">Current Time</Label>
              <p className="text-sm font-medium mt-1">
                {format(parseISO(appointment.startTime), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>

            {/* New Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-date">New Date</Label>
                <Input
                  id="new-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-time">New Time</Label>
                <Input
                  id="new-time"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>
            </div>

            {/* New Time Preview */}
            {newDate && newStartTime && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm">
                  <span className="text-muted-foreground">New appointment time: </span>
                  <span className="font-medium">
                    {format(
                      new Date(`${newDate}T${newStartTime}`),
                      "EEEE, MMMM d, yyyy 'at' h:mm a"
                    )}
                  </span>
                </p>
              </div>
            )}

            {/* Notification Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Notify Client</p>
                <p className="text-xs text-muted-foreground">
                  Send an email/SMS notification about the time change
                </p>
              </div>
              <Button
                variant={sendNotification ? "default" : "outline"}
                size="sm"
                onClick={() => setSendNotification(!sendNotification)}
              >
                {sendNotification ? "On" : "Off"}
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            {canCancel && onCancel && (
              <Button 
                variant="destructive" 
                onClick={handleCancelAppointment} 
                disabled={saving || cancelling}
                className="flex-1 sm:flex-none"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Appointment
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || cancelling}>
              Close
            </Button>
            {!isCancelled && (
              <Button onClick={onSave} disabled={saving || cancelling}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
