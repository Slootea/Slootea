"use client";

import { useTranslations } from "next-intl";
import { format, parseISO, isBefore, isAfter } from "date-fns";
import { trackSlotSelected } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, Loader2, ArrowLeft, ChevronRight } from "lucide-react";
import { DateTimeSelectionStepProps } from "./types";

export function DateTimeSelectionStep({
  selectedDate,
  setSelectedDate,
  currentMonth,
  setCurrentMonth,
  slots,
  selectedSlot,
  setSelectedSlot,
  slotsLoading,
  availableDates,
  availableDatesLoading,
  providerSelectionEnabled,
  selectedProvider,
  selectedService,
  bookingLink,
  today,
  maxDate,
  dateLocale,
  showBackButton,
  onBack,
  onContinue,
}: DateTimeSelectionStepProps) {
  const t = useTranslations('booking');

  const handleSlotSelect = (slot: typeof slots[0]) => {
    setSelectedSlot(slot);
    trackSlotSelected({
      date: format(parseISO(slot.startTime), "yyyy-MM-dd"),
      time: format(parseISO(slot.startTime), "HH:mm"),
      serviceId: selectedService?.id || '',
      organizationId: bookingLink?.organizationId,
      organizationName: bookingLink?.user?.businessName,
    });
  };

  return (
    <div className="space-y-4 w-full">
      {/* Date Selection */}
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t('selectDate')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            locale={dateLocale}
            disabled={(date) => {
              if (isBefore(date, today) || isAfter(date, maxDate)) {
                return true;
              }
              if (providerSelectionEnabled && !selectedProvider) {
                return true;
              }
              const dateStr = format(date, "yyyy-MM-dd");
              return !availableDates.has(dateStr);
            }}
            modifiers={{
              available: (date) => {
                if (isBefore(date, today) || isAfter(date, maxDate)) return false;
                if (providerSelectionEnabled && !selectedProvider) return false;
                const dateStr = format(date, "yyyy-MM-dd");
                return availableDates.has(dateStr);
              },
            }}
            modifiersClassNames={{
              available: "bg-primary/10 font-semibold text-primary hover:bg-primary/20",
            }}
            className="rounded-md border"
          />
        </CardContent>
        {availableDatesLoading && (
          <div className="flex items-center justify-center text-sm text-muted-foreground pb-4">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {t('loadingAvailability') || 'Loading availability...'}
          </div>
        )}
      </Card>

      {/* Time Slots - only show when date is selected */}
      {selectedDate && (
        <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-center">
              {format(selectedDate, "EEEE, d MMMM", { locale: dateLocale })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slotsLoading ? (
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('noAvailableTimes')}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {slots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedSlot === slot ? "default" : "outline"}
                    size="sm"
                    className="transition-all duration-200 hover:scale-105 active:scale-95"
                    onClick={() => handleSlotSelect(slot)}
                  >
                    {format(parseISO(slot.startTime), "HH:mm")}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 pt-2">
        {showBackButton && (
          <Button
            variant="outline"
            className="flex-1"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('back') || 'Back'}
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={!selectedSlot}
          onClick={onContinue}
        >
          {t('continue') || 'Continue'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
