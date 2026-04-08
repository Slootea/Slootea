"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BlockTimeRangePicker } from "./block-time-range-picker";
import { BlockedTimeFormData } from "./types";

interface AddBlockedTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockedTime: BlockedTimeFormData;
  onBlockedTimeChange: (data: Partial<BlockedTimeFormData>) => void;
  onAdd: () => void;
}

export function AddBlockedTimeDialog({
  open,
  onOpenChange,
  blockedTime,
  onBlockedTimeChange,
  onAdd,
}: AddBlockedTimeDialogProps) {
  const t = useTranslations('providersPage');
  const common = useTranslations('common');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('blockedTime.addTitle')}</DialogTitle>
          <DialogDescription>{t('blockedTime.addDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('blockedTime.date')}</Label>
            <Input
              type="date"
              value={blockedTime.date}
              onChange={(e) => onBlockedTimeChange({ date: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="isFullDay"
              checked={blockedTime.isFullDay}
              onCheckedChange={(checked) => onBlockedTimeChange({ isFullDay: checked })}
            />
            <Label htmlFor="isFullDay">{t('blockedTime.fullDayLabel')}</Label>
          </div>

          {!blockedTime.isFullDay && (
            <BlockTimeRangePicker
              startTime={blockedTime.startTime}
              endTime={blockedTime.endTime}
              onTimeChange={(start, end) => onBlockedTimeChange({ startTime: start, endTime: end })}
            />
          )}

          <div className="space-y-2">
            <Label>{t('blockedTime.reason')}</Label>
            <Input
              value={blockedTime.reason}
              onChange={(e) => onBlockedTimeChange({ reason: e.target.value })}
              placeholder={t('blockedTime.reasonPlaceholder')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {common('cancel')}
          </Button>
          <Button onClick={onAdd} disabled={!blockedTime.date}>
            {t('blockedTime.addButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
