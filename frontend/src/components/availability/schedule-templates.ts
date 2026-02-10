import { LucideIcon, Briefcase, Sunrise, Moon, Clock, Calendar } from "lucide-react";

export interface ScheduleTemplate {
  name: string;
  icon: LucideIcon;
  slots: { startTime: string; endTime: string }[];
  days: number[];
}

export const SCHEDULE_TEMPLATES = {
  standard: {
    name: "Standard (9-5)",
    icon: Briefcase,
    slots: [{ startTime: "09:00", endTime: "17:00" }],
    days: [0, 1, 2, 3, 4],
  },
  morning: {
    name: "Morning Hours",
    icon: Sunrise,
    slots: [{ startTime: "06:00", endTime: "12:00" }],
    days: [0, 1, 2, 3, 4],
  },
  evening: {
    name: "Evening Hours",
    icon: Moon,
    slots: [{ startTime: "17:00", endTime: "21:00" }],
    days: [0, 1, 2, 3, 4],
  },
  splitShift: {
    name: "Split Shift",
    icon: Clock,
    slots: [
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "14:00", endTime: "18:00" },
    ],
    days: [0, 1, 2, 3, 4],
  },
  fullWeek: {
    name: "Full Week",
    icon: Calendar,
    slots: [{ startTime: "09:00", endTime: "17:00" }],
    days: [0, 1, 2, 3, 4, 5, 6],
  },
} as const satisfies Record<string, ScheduleTemplate>;

export type ScheduleTemplateKey = keyof typeof SCHEDULE_TEMPLATES;
