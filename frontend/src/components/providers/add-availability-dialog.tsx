"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisualTimeRangePicker } from "./visual-time-range-picker";
import { DAY_NAMES, AvailabilityFormData } from "./types";

interface AddAvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: number;
  availability: AvailabilityFormData;
  onAvailabilityChange: (data: AvailabilityFormData) => void;
  onAdd: () => void;
}

export function AddAvailabilityDialog({
  open,
  onOpenChange,
  selectedDay,
  availability,
  onAvailabilityChange,
  onAdd,
}: AddAvailabilityDialogProps) {
  const t = useTranslations('providersPage');
  const common = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('availability.addTitle')}</DialogTitle>
          <DialogDescription>
            Add working hours for {DAY_NAMES[selectedDay]}
          </DialogDescription>
        </DialogHeader>

        <VisualTimeRangePicker
          startTime={availability.startTime}
          endTime={availability.endTime}
          onTimeChange={(start, end) => onAvailabilityChange({ startTime: start, endTime: end })}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {common('cancel')}
          </Button>
          <Button onClick={onAdd}>
            {t('availability.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
