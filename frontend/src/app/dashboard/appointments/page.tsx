"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  appointmentsApi,
  serviceOptionsApi,
  setAuthToken,
  setOrganizationContext,
} from "@/lib/api";
import {
  Appointment,
  AppointmentStatus,
  ServiceOption,
  PaginatedResult,
  AppointmentFilters,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowUpDown,
  RefreshCw,
  Users,
  Bell,
  Hourglass,
  Sparkles,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow, isToday, isTomorrow, isPast, isFuture, differenceInMinutes, differenceInHours, addHours } from "date-fns";
import { useTranslations } from "next-intl";
import { useOrganizationContext } from "@/components/providers/organization-provider";

export default function AppointmentsPage() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const t = useTranslations("appointmentsPage");
  const tCommon = useTranslations("common");
  const { currentOrganization, isAdmin, members } = useOrganizationContext();

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Member filter state (for organization admins)
  const [selectedMember, setSelectedMember] = useState<string>("all");

  // Pagination & Filters
  const [filters, setFilters] = useState<AppointmentFilters>({
    page: 1,
    limit: 10,
    sortBy: "startTime",
    sortOrder: "DESC",
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Computed: Get upcoming confirmed appointments (within next 24 hours)
  const upcomingConfirmedAppointments = useMemo(() => {
    const now = new Date();
    const next24Hours = addHours(now, 24);
    
    return allAppointments.filter((apt) => {
      const startTime = parseISO(apt.startTime);
      return (
        apt.status === AppointmentStatus.CONFIRMED &&
        isFuture(startTime) &&
        startTime <= next24Hours
      );
    }).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
  }, [allAppointments]);

  // Computed: Get the next pending confirmation appointment for current user (provider)
  const nextPendingAppointment = useMemo(() => {
    const pending = allAppointments.filter(
      (apt) => 
        apt.status === AppointmentStatus.PENDING_CONFIRMATION && 
        isFuture(parseISO(apt.startTime)) &&
        apt.user?.clerkId === user?.id // Only show if current user is the provider
    ).sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
    
    return pending.length > 0 ? pending[0] : null; // Return only the nearest one
  }, [allAppointments, user?.id]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async (showRefreshing = false) => {
    const token = await getToken();
    setAuthToken(token);
    if (currentOrganization) {
      setOrganizationContext(currentOrganization.id);
    }

    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      // Build query params for paginated results
      const queryParams: Record<string, any> = {
        page: filters.page,
        limit: filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (debouncedSearch) {
        queryParams.search = debouncedSearch;
      }

      if (filters.status && filters.status !== "all") {
        queryParams.status = filters.status;
      }

      if (filters.startDate) {
        queryParams.startDate = filters.startDate;
      }

      if (filters.endDate) {
        queryParams.endDate = filters.endDate;
      }

      if (filters.serviceOptionId) {
        queryParams.serviceOptionId = filters.serviceOptionId;
      }

      // If admin and a specific member is selected, filter by userId
      if (currentOrganization && isAdmin && selectedMember !== "all") {
        queryParams.userId = selectedMember;
      }

      // Fetch all appointments for sections (upcoming confirmed & pending) - only future appointments
      const allQueryParams: Record<string, any> = {
        page: 1,
        limit: 50,
        sortBy: "startTime",
        sortOrder: "ASC",
        startDate: new Date().toISOString(),
      };
      if (currentOrganization && isAdmin && selectedMember !== "all") {
        allQueryParams.userId = selectedMember;
      }

      // Fetch data sequentially to avoid rate limiting
      // First fetch paginated appointments (main list)
      const appointmentsRes = await appointmentsApi.getAll(queryParams);
      const paginatedData = appointmentsRes.data as PaginatedResult<Appointment>;
      setAppointments(paginatedData.data);
      setPagination(paginatedData.meta);

      // Then fetch future appointments for sections (with a small delay)
      const allAppointmentsRes = await appointmentsApi.getAll(allQueryParams);
      const allData = allAppointmentsRes.data as PaginatedResult<Appointment>;
      setAllAppointments(allData.data);
      
      // Derive next appointment from allAppointments (confirmed, future, sorted by startTime ASC)
      const confirmedFuture = allData.data.filter(
        (apt) => apt.status === AppointmentStatus.CONFIRMED
      );
      setNextAppointment(confirmedFuture.length > 0 ? confirmedFuture[0] : null);

      // Finally fetch service options
      const servicesRes = await serviceOptionsApi.getAll();
      setServiceOptions(servicesRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: tCommon("error"),
        description: t("messages.loadFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, filters, debouncedSearch, toast, currentOrganization, isAdmin, selectedMember, t, tCommon]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, filters.status, filters.serviceOptionId, filters.startDate, filters.endDate]);

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await appointmentsApi.update(id, { status });
      toast({ title: t("messages.statusUpdated") });
      fetchData(true);
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.statusUpdateFailed"),
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm(t("confirmCancel"))) return;

    try {
      await appointmentsApi.cancel(id);
      toast({ title: t("messages.cancelled") });
      fetchData(true);
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.cancelFailed"),
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "all") {
      setFilters((prev) => ({ ...prev, status: undefined, startDate: undefined, page: 1, sortOrder: "DESC" }));
    } else if (tab === "upcoming") {
      // For upcoming, we filter by start date being today or later
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setFilters((prev) => ({
        ...prev,
        status: undefined,
        startDate: today.toISOString(),
        page: 1,
        sortOrder: "ASC",
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        status: tab as AppointmentStatus,
        startDate: undefined,
        page: 1,
        sortOrder: "DESC",
      }));
    }
  };

  const toggleSortOrder = () => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === "ASC" ? "DESC" : "ASC",
    }));
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Confirmed Section - Only visible when there are approaching confirmed appointments */}
      {upcomingConfirmedAppointments.length > 0 && (
        <UpcomingConfirmedSection
          appointments={upcomingConfirmedAppointments}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
        />
      )}

      {/* Pending Confirmation Section - Shows next pending appointment for current provider */}
      {nextPendingAppointment && (
        <PendingConfirmationSection
          appointment={nextPendingAppointment}
          onStatusChange={handleStatusChange}
          onCancel={handleCancel}
        />
      )}

      {/* Main Appointments List */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                All Appointments
              </CardTitle>
              <CardDescription className="mt-1">
                Complete history and management of all appointments
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="self-start sm:self-auto"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-4 flex-wrap h-auto gap-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                Upcoming
              </TabsTrigger>
              <TabsTrigger
                value={AppointmentStatus.PENDING_CONFIRMATION}
                className="text-xs sm:text-sm"
              >
                Pending
              </TabsTrigger>
              <TabsTrigger
                value={AppointmentStatus.CONFIRMED}
                className="text-xs sm:text-sm"
              >
                Confirmed
              </TabsTrigger>
              <TabsTrigger
                value={AppointmentStatus.COMPLETED}
                className="text-xs sm:text-sm"
              >
                Completed
              </TabsTrigger>
              <TabsTrigger
                value={AppointmentStatus.CANCELLED}
                className="text-xs sm:text-sm"
              >
                Cancelled
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Member Filter (Organization Admin only) */}
              {currentOrganization && isAdmin && members.length > 0 && (
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        All Members
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
                              ? `${member.firstName} ${member.lastName || ''}`
                              : member.email.split('@')[0]}
                          </span>
                          {member.role === 'org:admin' && (
                            <Badge variant="outline" className="text-xs ml-1">Admin</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select
                value={filters.serviceOptionId || "all"}
                onValueChange={(v) =>
                  setFilters((prev) => ({
                    ...prev,
                    serviceOptionId: v === "all" ? undefined : v,
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleSortOrder}
                title={`Sort ${filters.sortOrder === "ASC" ? "Oldest first" : "Newest first"}`}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {appointments.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Client</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.map((appointment) => (
                          <AppointmentRow
                            key={appointment.id}
                            appointment={appointment}
                            onStatusChange={handleStatusChange}
                            onCancel={handleCancel}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {appointments.map((appointment) => (
                      <AppointmentMobileCard
                        key={appointment.id}
                        appointment={appointment}
                        onStatusChange={handleStatusChange}
                        onCancel={handleCancel}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// Upcoming Confirmed Section - Shows confirmed appointments approaching within 24 hours
function UpcomingConfirmedSection({
  appointments,
  onStatusChange,
  onCancel,
}: {
  appointments: Appointment[];
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
}) {
  return (
    <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 shadow-lg overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                Confirmed & Coming Up
              </CardTitle>
              <CardDescription className="text-emerald-700/70 dark:text-emerald-300/70">
                {appointments.length} confirmed appointment{appointments.length !== 1 ? 's' : ''} in the next 24 hours
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3">
          {appointments.slice(0, 5).map((appointment, index) => (
            <UpcomingAppointmentCard
              key={appointment.id}
              appointment={appointment}
              onStatusChange={onStatusChange}
              onCancel={onCancel}
              isFirst={index === 0}
            />
          ))}
          {appointments.length > 5 && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center py-2">
              +{appointments.length - 5} more confirmed appointments
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Individual upcoming appointment card
function UpcomingAppointmentCard({
  appointment,
  onStatusChange,
  onCancel,
  isFirst,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
  isFirst: boolean;
}) {
  const startTime = parseISO(appointment.startTime);
  const endTime = parseISO(appointment.endTime);
  const minutesUntil = differenceInMinutes(startTime, new Date());
  const hoursUntil = differenceInHours(startTime, new Date());
  const isImminent = minutesUntil <= 60 && minutesUntil > 0;
  const isNow = minutesUntil <= 0 && minutesUntil > -(appointment.serviceOption?.duration || 60);

  const getTimeLabel = () => {
    if (isNow) return "Happening now";
    if (minutesUntil < 60) return `In ${minutesUntil} minutes`;
    if (hoursUntil < 24) return `In ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`;
    return formatDistanceToNow(startTime, { addSuffix: true });
  };

  return (
    <div
      className={`relative p-4 rounded-xl border transition-all ${
        isNow
          ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 shadow-md"
          : isImminent
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50"
          : "bg-white/80 dark:bg-gray-900/40 border-emerald-100 dark:border-emerald-800/30"
      } ${isFirst ? "ring-2 ring-emerald-500/20" : ""}`}
    >
      {(isNow || isImminent) && (
        <div className={`absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium rounded-full ${
          isNow
            ? "bg-green-500 text-white"
            : "bg-amber-500 text-white"
        }`}>
          {isNow ? "NOW" : "SOON"}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${
            isNow
              ? "bg-green-200 dark:bg-green-800"
              : isImminent
              ? "bg-amber-200 dark:bg-amber-800"
              : "bg-emerald-100 dark:bg-emerald-800/50"
          }`}>
            <Clock className={`h-5 w-5 ${
              isNow
                ? "text-green-700 dark:text-green-300"
                : isImminent
                ? "text-amber-700 dark:text-amber-300"
                : "text-emerald-600 dark:text-emerald-400"
            }`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {appointment.clientName}
              </h4>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isNow
                  ? "bg-green-500/10 text-green-700 dark:text-green-300"
                  : isImminent
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}>
                {getTimeLabel()}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {isToday(startTime)
                  ? "Today"
                  : isTomorrow(startTime)
                  ? "Tomorrow"
                  : format(startTime, "MMM d")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" />
                {appointment.serviceOption?.title || "Service"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onStatusChange(appointment.id, AppointmentStatus.COMPLETED)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Complete
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onStatusChange(appointment.id, AppointmentStatus.NO_SHOW)}
              >
                <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                Mark No Show
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onCancel(appointment.id)}
                className="text-red-600 focus:text-red-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {appointment.notes && (
        <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-800/30">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Notes:</span> {appointment.notes}
          </p>
        </div>
      )}
    </div>
  );
}

// Pending Confirmation Section - Shows single pending appointment
function PendingConfirmationSection({
  appointment,
  onStatusChange,
  onCancel,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
}) {
  const startTime = parseISO(appointment.startTime);
  const endTime = parseISO(appointment.endTime);

  return (
    <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 shadow-lg overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
              <Hourglass className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                Pending Confirmation
              </CardTitle>
              <CardDescription className="text-amber-700/70 dark:text-amber-300/70">
                New booking request awaiting your response
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-700">
            <Bell className="h-3.5 w-3.5 mr-1" />
            Action Required
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-900/40 border border-amber-100 dark:border-amber-800/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Client Info */}
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-800/50">
                <User className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {appointment.clientName}
                </h4>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {appointment.clientEmail}
                </p>
                {appointment.clientPhone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3.5 w-3.5" />
                    {appointment.clientPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Appointment Details */}
            <div className="flex flex-wrap items-center gap-4 lg:gap-6">
              <div className="flex items-center gap-2 text-sm">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {isToday(startTime)
                      ? "Today"
                      : isTomorrow(startTime)
                      ? "Tomorrow"
                      : format(startTime, "EEE, MMM d")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <Timer className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {appointment.serviceOption?.title || "Service"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {appointment.serviceOption?.duration || 30} minutes
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 lg:ml-auto">
              <Button
                size="lg"
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md"
                onClick={() => onStatusChange(appointment.id, AppointmentStatus.CONFIRMED)}
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Confirm
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                onClick={() => onCancel(appointment.id)}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Decline
              </Button>
            </div>
          </div>
          
          {appointment.notes && (
            <div className="mt-4 pt-4 border-t border-amber-100 dark:border-amber-800/30">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-gray-700 dark:text-gray-300">Client Notes:</span>{" "}
                {appointment.notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Table Row Component
function AppointmentRow({
  appointment,
  onStatusChange,
  onCancel,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
}) {
  const startTime = parseISO(appointment.startTime);
  const endTime = parseISO(appointment.endTime);
  const isAppointmentPast = isPast(endTime);
  const canModify =
    !isAppointmentPast &&
    appointment.status !== AppointmentStatus.CANCELLED &&
    appointment.status !== AppointmentStatus.COMPLETED;

  return (
    <TableRow className={isAppointmentPast ? "opacity-60" : ""}>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{appointment.clientName}</span>
          <span className="text-sm text-muted-foreground">
            {appointment.clientEmail}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {appointment.serviceOption?.title || "—"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {isToday(startTime)
              ? "Today"
              : isTomorrow(startTime)
              ? "Tomorrow"
              : format(startTime, "MMM d, yyyy")}
          </span>
          <span className="text-sm text-muted-foreground">
            {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={appointment.status} />
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canModify && (
              <>
                {appointment.status === AppointmentStatus.PENDING_CONFIRMATION && (
                  <DropdownMenuItem
                    onClick={() =>
                      onStatusChange(appointment.id, AppointmentStatus.CONFIRMED)
                    }
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Confirm
                  </DropdownMenuItem>
                )}
                {appointment.status === AppointmentStatus.CONFIRMED && (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        onStatusChange(
                          appointment.id,
                          AppointmentStatus.COMPLETED
                        )
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" />
                      Mark Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onStatusChange(appointment.id, AppointmentStatus.NO_SHOW)
                      }
                    >
                      <AlertCircle className="h-4 w-4 mr-2 text-yellow-600" />
                      Mark No Show
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onCancel(appointment.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Appointment
                </DropdownMenuItem>
              </>
            )}
            {!canModify && (
              <DropdownMenuItem disabled>
                No actions available
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// Mobile Card Component
function AppointmentMobileCard({
  appointment,
  onStatusChange,
  onCancel,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
}) {
  const startTime = parseISO(appointment.startTime);
  const endTime = parseISO(appointment.endTime);
  const isAppointmentPast = isPast(endTime);
  const canModify =
    !isAppointmentPast &&
    appointment.status !== AppointmentStatus.CANCELLED &&
    appointment.status !== AppointmentStatus.COMPLETED;

  return (
    <Card className={isAppointmentPast ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold">{appointment.clientName}</h4>
            <p className="text-sm text-muted-foreground">
              {appointment.clientEmail}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Timer className="h-4 w-4" />
            {appointment.serviceOption?.title || "Service"}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {isToday(startTime)
              ? "Today"
              : isTomorrow(startTime)
              ? "Tomorrow"
              : format(startTime, "MMM d, yyyy")}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
          </div>
          {appointment.clientPhone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              {appointment.clientPhone}
            </div>
          )}
        </div>

        {canModify && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            {appointment.status === AppointmentStatus.PENDING_CONFIRMATION && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() =>
                  onStatusChange(appointment.id, AppointmentStatus.CONFIRMED)
                }
              >
                Confirm
              </Button>
            )}
            {appointment.status === AppointmentStatus.CONFIRMED && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() =>
                  onStatusChange(appointment.id, AppointmentStatus.COMPLETED)
                }
              >
                Complete
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-red-600"
              onClick={() => onCancel(appointment.id)}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Status Badge Component
function StatusBadge({
  status,
  size = "default",
}: {
  status: AppointmentStatus;
  size?: "default" | "lg";
}) {
  const config: Record<
    AppointmentStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
  > = {
    [AppointmentStatus.PENDING_CONFIRMATION]: {
      label: "Pending",
      variant: "outline",
      icon: <AlertCircle className="h-3 w-3" />,
    },
    [AppointmentStatus.CONFIRMED]: {
      label: "Confirmed",
      variant: "default",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    [AppointmentStatus.CANCELLED]: {
      label: "Cancelled",
      variant: "destructive",
      icon: <XCircle className="h-3 w-3" />,
    },
    [AppointmentStatus.COMPLETED]: {
      label: "Completed",
      variant: "secondary",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    [AppointmentStatus.NO_SHOW]: {
      label: "No Show",
      variant: "outline",
      icon: <AlertCircle className="h-3 w-3" />,
    },
  };

  const { label, variant, icon } = config[status];

  return (
    <Badge variant={variant} className={size === "lg" ? "text-sm px-3 py-1" : ""}>
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
    </Badge>
  );
}

// Pagination Component
function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  onPageChange: (page: number) => void;
}) {
  const startItem = (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  if (pagination.total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{startItem}</span> to{" "}
        <span className="font-medium">{endItem}</span> of{" "}
        <span className="font-medium">{pagination.total}</span> results
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            let pageNum: number;
            if (pagination.totalPages <= 5) {
              pageNum = i + 1;
            } else if (pagination.page <= 3) {
              pageNum = i + 1;
            } else if (pagination.page >= pagination.totalPages - 2) {
              pageNum = pagination.totalPages - 4 + i;
            } else {
              pageNum = pagination.page - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={pagination.page === pageNum ? "default" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Calendar className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No appointments found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Try adjusting your filters or search criteria to find what you&apos;re looking
        for.
      </p>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Upcoming Confirmed Skeleton */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl border bg-white/80 dark:bg-gray-900/40">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pending Confirmation Skeleton - Single card */}
      <Card className="border-2 border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="p-5 rounded-xl border bg-white/80 dark:bg-gray-900/40">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-4 lg:ml-auto">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main List Skeleton */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-20" />
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              <Skeleton className="h-10 flex-1 min-w-[200px]" />
              <Skeleton className="h-10 w-[200px]" />
              <Skeleton className="h-10 w-10" />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
