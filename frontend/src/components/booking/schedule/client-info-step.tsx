"use client";

import { useTranslations } from "next-intl";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from "@/components/ui/phone-input";
import { User, Mail, ArrowLeft, Loader2, Check } from "lucide-react";
import { ClientInfoStepProps } from "./types";

export function ClientInfoStep({
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
  clientEmail,
  setClientEmail,
  selectedService,
  selectedProvider,
  selectedSlot,
  dateLocale,
  booking,
  onBack,
  onSubmit,
}: ClientInfoStepProps) {
  const t = useTranslations('booking');

  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <User className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{t('yourInformation')}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t('enterContactDetails') || 'Enter your contact details to confirm'}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <Label htmlFor="phone">{t('phone')} *</Label>
          <PhoneInput
            id="phone"
            value={clientPhone}
            onChange={(value) => setClientPhone(value || "")}
            placeholder={t('phonePlaceholder')}
            defaultCountry="TR"
          />
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

        <Separator className="my-4" />

        {/* Appointment Summary */}
        <div className="bg-muted/50 p-4 rounded-xl space-y-2">
          <p className="font-semibold text-sm">{t('appointmentSummary')}</p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Check className="h-2.5 w-2.5 text-primary" />
              </span>
              {selectedService.title}
            </p>
            {selectedProvider && (
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Check className="h-2.5 w-2.5 text-primary" />
                </span>
                {selectedProvider.firstName || selectedProvider.lastName 
                  ? `${selectedProvider.firstName || ''} ${selectedProvider.lastName || ''}`.trim()
                  : t('provider') || 'Provider'}
              </p>
            )}
            {selectedSlot && (
              <>
                <p className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-2.5 w-2.5 text-primary" />
                  </span>
                  {format(parseISO(selectedSlot.startTime), "EEEE, d MMMM yyyy", { locale: dateLocale })}
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-2.5 w-2.5 text-primary" />
                  </span>
                  {format(parseISO(selectedSlot.startTime), "HH:mm", { locale: dateLocale })} - {format(parseISO(selectedSlot.endTime), "HH:mm", { locale: dateLocale })}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('back') || 'Back'}
          </Button>
          <Button
            className="flex-1"
            onClick={onSubmit}
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
        </div>
      </CardContent>
    </Card>
  );
}
