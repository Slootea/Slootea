"use client";

import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, User, CalendarDays, ArrowLeftRight, Loader2 } from "lucide-react";
import { PendingChange } from "./types";

interface MoveConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingChange: PendingChange | null;
  sendNotification: boolean;
  setSendNotification: (value: boolean) => void;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MoveConfirmationDialog({
  open,
  onOpenChange,
  pendingChange,
  sendNotification,
  setSendNotification,
  saving,
  onConfirm,
  onCancel,
}: MoveConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(openState) => {
        if (!openState && !saving) {
          onOpenChange(false);
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pendingChange?.type === "swap" ? (
              <>
                <ArrowLeftRight className="h-5 w-5" />
                Swap Appointment Times
              </>
            ) : (
              <>
                <CalendarDays className="h-5 w-5" />
                Move Appointment
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {pendingChange?.type === "swap"
              ? "The appointments overlap. Their times will be swapped."
              : "Confirm the new appointment time."}
          </DialogDescription>
        </DialogHeader>

        {pendingChange && (
          <div className="space-y-4 py-4">
            {/* Primary appointment */}
            <AppointmentCard
              clientName={pendingChange.appointment.clientName}
              status={pendingChange.appointment.status}
              serviceTitle={pendingChange.appointment.serviceOption?.title}
              currentTime={parseISO(pendingChange.appointment.startTime)}
              newTime={pendingChange.newStartTime}
            />

            {/* Swap target appointment */}
            {pendingChange.type === "swap" &&
              pendingChange.swapWith &&
              pendingChange.swapWithNewStartTime && (
                <>
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <AppointmentCard
                    clientName={pendingChange.swapWith.clientName}
                    status={pendingChange.swapWith.status}
                    serviceTitle={pendingChange.swapWith.serviceOption?.title}
                    currentTime={parseISO(pendingChange.swapWith.startTime)}
                    newTime={pendingChange.swapWithNewStartTime}
                  />
                </>
              )}

            {/* Notification Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">
                  Notify Client{pendingChange.type === "swap" ? "s" : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Send email/SMS notification about the time change
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

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>{pendingChange?.type === "swap" ? "Swap Times" : "Move Appointment"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AppointmentCardProps {
  clientName: string;
  status: string;
  serviceTitle?: string;
  currentTime: Date;
  newTime: Date;
}

function AppointmentCard({
  clientName,
  status,
  serviceTitle,
  currentTime,
  newTime,
}: AppointmentCardProps) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{clientName}</span>
        <Badge variant="outline" className="ml-auto">
          {status.replace("_", " ")}
        </Badge>
      </div>
      {serviceTitle && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {serviceTitle}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Current Time</p>
          <p className="text-sm font-medium">{format(currentTime, "MMM d, h:mm a")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">New Time</p>
          <p className="text-sm font-medium text-primary">{format(newTime, "MMM d, h:mm a")}</p>
        </div>
      </div>
    </div>
  );
}
