"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";;
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Clock, User, Phone, Mail, Pencil, Loader2, XCircle, ExternalLink, CheckCircle, CheckCheck } from "lucide-react";
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
  onConfirm?: (id: string) => Promise<void>;
  onComplete?: (id: string) => Promise<void>;
  cancelling?: boolean;
  confirming?: boolean;
  completing?: boolean;
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
  onConfirm,
  onComplete,
  cancelling = false,
  confirming = false,
  completing = false,
}: EditAppointmentDialogProps) {
  const router = useRouter();
  const t = useTranslations("calendarPage.editDialog");
  const { locale } = useLocale();
  const dateLocale = locale === "tr" ? tr : enUS;
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  
  const isCancelled = appointment?.status === AppointmentStatus.CANCELLED;
  const isCompleted = appointment?.status === AppointmentStatus.COMPLETED;
  const isPending = appointment?.status === AppointmentStatus.PENDING_CONFIRMATION;
  const isConfirmed = appointment?.status === AppointmentStatus.CONFIRMED;
  const canCancel = !isCancelled && !isCompleted;
  const canConfirm = isPending && onConfirm;
  const canComplete = isConfirmed && onComplete;
  
  const handleViewClientProfile = () => {
    if (appointment?.clientId) {
      router.push(`/dashboard/clients?highlight=${appointment.clientId}`);
      onOpenChange(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelAlert(true);
  };

  const handleCancelAppointment = async () => {
    if (!appointment || !onCancel) return;
    setShowCancelAlert(false);
    await onCancel(appointment.id);
    onOpenChange(false);
  };

  const handleConfirmAppointment = async () => {
    if (!appointment || !onConfirm) return;
    await onConfirm(appointment.id);
    onOpenChange(false);
  };

  const handleCompleteAppointment = async () => {
    if (!appointment || !onComplete) return;
    await onComplete(appointment.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description")}
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
                  {t("viewClientProfile")}
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
              <Label className="text-muted-foreground">{t("currentTime")}</Label>
              <p className="text-sm font-medium mt-1">
                {format(parseISO(appointment.startTime), "EEEE, MMMM d, yyyy 'at' h:mm a", { locale: dateLocale })}
              </p>
            </div>

            {/* New Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-date">{t("newDate")}</Label>
                <Input
                  id="new-date"
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-time">{t("newTime")}</Label>
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
                  <span className="text-muted-foreground">{t("newAppointmentTime")} </span>
                  <span className="font-medium">
                    {format(
                      new Date(`${newDate}T${newStartTime}`),
                      "EEEE, MMMM d, yyyy 'at' h:mm a",
                      { locale: dateLocale }
                    )}
                  </span>
                </p>
              </div>
            )}

            {/* Appointment Actions */}
            {(canConfirm || canComplete || (canCancel && onCancel)) && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("appointmentStatus")}</Label>
                <div className="flex gap-2">
                  {canConfirm && (
                    <Button 
                      variant="default" 
                      onClick={handleConfirmAppointment} 
                      disabled={saving || cancelling || confirming || completing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {confirming ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {confirming ? t("confirming") : t("confirm")}
                    </Button>
                  )}
                  {canComplete && (
                    <Button 
                      variant="default" 
                      onClick={handleCompleteAppointment} 
                      disabled={saving || cancelling || confirming || completing}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {completing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4 mr-2" />
                      )}
                      {completing ? t("completing") : t("complete")}
                    </Button>
                  )}
                  {canCancel && onCancel && (
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelClick} 
                      disabled={saving || cancelling || confirming || completing}
                      className="flex-1"
                    >
                      {cancelling ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      {cancelling ? t("cancelling") : t("cancel")}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Notification Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{t("notifyClient")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("sendNotificationAboutChanges")}
                </p>
              </div>
              <Button
                variant={sendNotification ? "default" : "outline"}
                size="sm"
                onClick={() => setSendNotification(!sendNotification)}
              >
                {sendNotification ? t("on") : t("off")}
              </Button>
            </div>
          </div>
        )}

        <Separator />

        <DialogFooter>
          {!isCancelled && (
            <Button onClick={onSave} disabled={saving || cancelling || confirming || completing}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {saving ? t("saving") : t("saveChanges")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Cancel Confirmation Alert */}
      <AlertDialog open={showCancelAlert} onOpenChange={setShowCancelAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelAlert.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {sendNotification ? t("cancelAlert.descriptionWithNotification") : t("cancelAlert.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelAlert.keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("cancelAlert.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
