"use client";

import { format } from "date-fns";
import { enUS, tr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";;
import { CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  Calendar as CalendarIcon,
  GripVertical,
  Users,
  Plus,
} from "lucide-react";
import { OrganizationMember } from "@/components/providers/organization-provider";

interface CalendarHeaderProps {
  viewMode: "week" | "day";
  setViewMode: (mode: "week" | "day") => void;
  currentDate: Date;
  weekStart: Date;
  weekEnd: Date;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
  // Organization admin props
  showMemberFilter: boolean;
  selectedMember: string;
  setSelectedMember: (member: string) => void;
  members: OrganizationMember[];
  // Add appointment callback
  onAddAppointment?: () => void;
}

export function CalendarHeader({
  viewMode,
  setViewMode,
  currentDate,
  weekStart,
  weekEnd,
  goToToday,
  goToPrevious,
  goToNext,
  showMemberFilter,
  selectedMember,
  setSelectedMember,
  members,
  onAddAppointment,
}: CalendarHeaderProps) {
  const t = useTranslations("calendarPage");
  const { locale } = useLocale();
  const dateLocale = locale === "tr" ? tr : enUS;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {viewMode === "week"
              ? `${format(weekStart, "MMM d", { locale: dateLocale })} - ${format(weekEnd, "MMM d, yyyy", { locale: dateLocale })}`
              : format(currentDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })}
          </CardTitle>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Appointment Button */}
          {onAddAppointment && (
            <Button onClick={onAddAppointment} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("addAppointment")}
            </Button>
          )}

          {/* Member Filter (Organization Admin only) */}
          {showMemberFilter && members.length > 0 && (
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("allMembers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t("allMembers")}
                  </div>
                </SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.clerkId} value={member.clerkId}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={member.imageUrl} />
                        <AvatarFallback className="text-xs">
                          {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {member.firstName
                          ? `${member.firstName} ${member.lastName || ""}`
                          : member.email.split("@")[0]}
                      </span>
                   
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "day")}>
            <TabsList>
              <TabsTrigger value="week" className="px-3">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {t("week")}
              </TabsTrigger>
              <TabsTrigger value="day" className="px-3">
                <Clock className="h-4 w-4 mr-1" />
                {t("day")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goToToday}>
              {t("today")}
            </Button>
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <CalendarLegend />
    </>
  );
}

function CalendarLegend() {
  const t = useTranslations("calendarPage.legend");

  return (
    <div className="flex flex-wrap gap-4 mt-4 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-green-500" />
        <span className="text-muted-foreground">{t("confirmed")}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-yellow-500" />
        <span className="text-muted-foreground">{t("pending")}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-blue-500" />
        <span className="text-muted-foreground">{t("completed")}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-red-500" />
        <span className="text-muted-foreground">{t("cancelled")}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
        <span className="text-muted-foreground">{t("available")}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" />
        <span className="text-muted-foreground">{t("blocked")}</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{t("dragToReschedule")}</span>
      </div>
    </div>
  );
}
