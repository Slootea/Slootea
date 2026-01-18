"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  appointmentsApi,
  serviceOptionsApi,
  setAuthToken,
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
} from "lucide-react";
import { format, parseISO, formatDistanceToNow, isToday, isTomorrow, isPast, differenceInMinutes } from "date-fns";

export default function AppointmentsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  // State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

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

    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      // Build query params
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

      // Fetch appointments with pagination
      const [appointmentsRes, nextRes, servicesRes] = await Promise.all([
        appointmentsApi.getAll(queryParams),
        appointmentsApi.getNext(),
        serviceOptionsApi.getAll(),
      ]);

      const paginatedData = appointmentsRes.data as PaginatedResult<Appointment>;
      setAppointments(paginatedData.data);
      setPagination(paginatedData.meta);
      setNextAppointment(nextRes.data);
      setServiceOptions(servicesRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, filters, debouncedSearch, toast]);

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
      toast({ title: "Status updated successfully" });
      fetchData(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      await appointmentsApi.cancel(id);
      toast({ title: "Appointment cancelled" });
      fetchData(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
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
    <div className="space-y-6">
      {/* Next Appointment Highlight */}
      {nextAppointment && (
        <NextAppointmentCard
          appointment={nextAppointment}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">
                Appointments
              </CardTitle>
              <CardDescription>
                Manage and track all your appointments
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
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

// Next Appointment Highlight Card
function NextAppointmentCard({
  appointment,
  onStatusChange,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
}) {
  const startTime = parseISO(appointment.startTime);
  const minutesUntil = differenceInMinutes(startTime, new Date());
  const isImminent = minutesUntil <= 60 && minutesUntil > 0;
  const isNow = minutesUntil <= 0 && minutesUntil > -(appointment.serviceOption?.duration || 60);

  return (
    <Card
      className={`border-2 ${
        isNow
          ? "border-green-500 bg-green-50 dark:bg-green-950/20"
          : isImminent
          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
          : "border-primary/50 bg-primary/5"
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-full ${
                isNow
                  ? "bg-green-500"
                  : isImminent
                  ? "bg-yellow-500"
                  : "bg-primary"
              }`}
            >
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isNow
                  ? "Happening Now"
                  : isImminent
                  ? "Starting Soon"
                  : "Next Appointment"}
              </CardTitle>
              <CardDescription>
                {isNow
                  ? "In progress"
                  : formatDistanceToNow(startTime, { addSuffix: true })}
              </CardDescription>
            </div>
          </div>
          <StatusBadge status={appointment.status} size="lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{appointment.clientName}</p>
              <p className="text-sm text-muted-foreground">
                {appointment.clientEmail}
              </p>
              {appointment.clientPhone && (
                <p className="text-sm text-muted-foreground">
                  {appointment.clientPhone}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">
                {isToday(startTime)
                  ? "Today"
                  : isTomorrow(startTime)
                  ? "Tomorrow"
                  : format(startTime, "EEEE, MMM d")}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(startTime, "h:mm a")} -{" "}
                {format(parseISO(appointment.endTime), "h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Timer className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">
                {appointment.serviceOption?.title || "Service"}
              </p>
              <p className="text-sm text-muted-foreground">
                {appointment.serviceOption?.duration} minutes
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {appointment.status === AppointmentStatus.PENDING_CONFIRMATION && (
              <Button
                size="sm"
                onClick={() =>
                  onStatusChange(appointment.id, AppointmentStatus.CONFIRMED)
                }
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Confirm
              </Button>
            )}
            {appointment.status === AppointmentStatus.CONFIRMED && (
              <Button
                size="sm"
                onClick={() =>
                  onStatusChange(appointment.id, AppointmentStatus.COMPLETED)
                }
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Notes: </span>
              {appointment.notes}
            </p>
          </div>
        )}
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
    <div className="space-y-6">
      {/* Next appointment skeleton */}
      <Card className="border-2 border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 mt-0.5" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main card skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-20" />
              ))}
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-[200px]" />
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
