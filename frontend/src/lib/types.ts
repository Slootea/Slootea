export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  timezone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  settings?: BusinessSettings;
}

export interface ServiceOption {
  id: string;
  title: string;
  description?: string;
  imageBase64?: string;
  duration: number;
  isActive: boolean;
  sortOrder: number;
  userId?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

// User-Service assignment for organization members
export interface UserServiceOption {
  id: string;
  userId: string;
  serviceOptionId: string;
  isActive: boolean;
  customDuration?: number;
  customDescription?: string;
  serviceOption?: ServiceOption;
  user?: User;
  createdAt: string;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  size?: number;
  phone?: string;
  location?: string;
  website?: string;
  logoUrl?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  joinedAt: string;
  user?: User;
}

export enum OrganizationRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  VIEWER = 'viewer',
}

// Provider Selection Mode
export type ProviderSelectionMode = 'client_chooses' | 'auto_assign';

// Organization Settings
export interface OrganizationSettings {
  id: string;
  organizationId: string;
  // Booking Settings
  confirmationRequiredHours: number;
  confirmationDeadlineHours: number;
  autoCancelUnconfirmed: boolean;
  bufferTimeMinutes: number;
  maxAppointmentsPerDay: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  // Provider Selection Settings
  allowProviderSelection: boolean;
  autoAssignProvider: boolean;
  providerSelectionMode: ProviderSelectionMode;
  showProviderNames: boolean;
  showProviderPhotos: boolean;
  // Display Settings
  welcomeMessage?: string;
  bookingInstructions?: string;
  confirmationMessage?: string;
  cancellationPolicy?: string;
  // Notification Settings
  sendEmailReminders: boolean;
  sendSmsReminders: boolean;
  reminderHoursBefore: number;
  // Timezone
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Availability {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
  userId: string;
  serviceOptionId?: string;
  serviceOption?: ServiceOption;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export enum DayOfWeek {
  MONDAY = 0,
  TUESDAY = 1,
  WEDNESDAY = 2,
  THURSDAY = 3,
  FRIDAY = 4,
  SATURDAY = 5,
  SUNDAY = 6,
}

export const DayOfWeekLabels: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'Monday',
  [DayOfWeek.TUESDAY]: 'Tuesday',
  [DayOfWeek.WEDNESDAY]: 'Wednesday',
  [DayOfWeek.THURSDAY]: 'Thursday',
  [DayOfWeek.FRIDAY]: 'Friday',
  [DayOfWeek.SATURDAY]: 'Saturday',
  [DayOfWeek.SUNDAY]: 'Sunday',
};

export interface BlockedTime {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  isFullDay: boolean;
  reason?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingLink {
  id: string;
  slug: string;
  name?: string;
  type: BookingLinkType;
  isActive: boolean;
  expiresAt?: string;
  organizationId: string;
  serviceOptionId?: string;
  serviceOption?: ServiceOption;
  createdAt: string;
  updatedAt: string;
}

export enum BookingLinkType {
  ALL_OPTIONS = 'all_options',
  SPECIFIC_OPTION = 'specific_option',
  CAMPAIGN = 'campaign',
}

export interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientId?: string;
  status: AppointmentStatus;
  confirmationToken: string;
  confirmedAt?: string;
  reminderSentAt?: string;
  notes?: string;
  userId: string;
  serviceOptionId: string;
  serviceOption?: ServiceOption;
  bookingLinkId?: string;
  user?: {
    id: string;
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export enum AppointmentStatus {
  PENDING_CONFIRMATION = 'pending_confirmation',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export const AppointmentStatusLabels: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING_CONFIRMATION]: 'Pending Confirmation',
  [AppointmentStatus.CONFIRMED]: 'Confirmed',
  [AppointmentStatus.CANCELLED]: 'Cancelled',
  [AppointmentStatus.COMPLETED]: 'Completed',
  [AppointmentStatus.NO_SHOW]: 'No Show',
};

export interface BusinessSettings {
  id: string;
  confirmationRequiredHours: number;
  confirmationDeadlineHours: number;
  autoCancelUnconfirmed: boolean;
  bufferTimeMinutes: number;
  maxAppointmentsPerDay: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todayAppointments: number;
  pendingConfirmations: number;
  upcomingAppointments: number;
  noShowRate: number;
  fillRate: number;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  providerId?: string;
}

export interface NextAvailableResult {
  available: boolean;
  nextSlot: {
    startTime: string;
    endTime: string;
    providerId?: string;
    providerName?: string;
  } | null;
  message?: string;
}

export interface AvailabilityCheckResult {
  available: boolean;
  conflict?: {
    reason: string;
    existingAppointment?: {
      id: string;
      clientName: string;
      startTime: string;
      endTime: string;
    };
  };
  nextAvailable?: {
    startTime: string;
    endTime: string;
    providerId?: string;
    providerName?: string;
  };
}

export interface Provider {
  id: string;
  clerkId: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

export interface ProvidersResponse {
  providers: Provider[];
  providerSelectionEnabled: boolean;
}

export interface PublicBookingSettings {
  providerSelectionMode: ProviderSelectionMode;
  showProviderNames: boolean;
  showProviderPhotos: boolean;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
}

export interface PublicBookingLink extends BookingLink {
  user: User;
  serviceOptions: ServiceOption[];
  settings?: PublicBookingSettings;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface AppointmentFilters {
  page?: number;
  limit?: number;
  status?: AppointmentStatus | 'all';
  search?: string;
  startDate?: string;
  endDate?: string;
  serviceOptionId?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Client Penalty Types - defined before Client to avoid reference errors
export enum PenaltyType {
  BAN = 'ban',
  SUSPENSION = 'suspension',
}

export enum PenaltyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REMOVED = 'removed',
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone: string;
  notes?: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  lastAppointmentAt?: string;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
  // Active penalty info (if any)
  activePenalty?: {
    id: string;
    type: PenaltyType;
    expiresAt?: string | null;
  } | null;
}

export interface ClientPenalty {
  id: string;
  clientId: string;
  organizationId: string;
  type: PenaltyType;
  status: PenaltyStatus;
  reason?: string;
  expiresAt?: string;
  issuedBy?: string;
  removedBy?: string;
  removedAt?: string;
  removalReason?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
}

export interface CreatePenaltyDto {
  clientId: string;
  type: PenaltyType;
  reason?: string;
  expiresAt?: string;
}

export interface RemovePenaltyDto {
  removalReason?: string;
}

export interface ClientFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ClientStats {
  totalClients: number;
  newClientsThisMonth: number;
  repeatClients: number;
}

// Reports Types
export interface MonthlyAnalytics {
  month: string;
  year: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  pendingAppointments: number;
  newClients: number;
  revenue: number;
}

export interface MemberStats {
  memberId: string;
  memberName: string;
  memberEmail: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  completionRate: number;
  noShowRate: number;
  averageAppointmentsPerDay: number;
}

export interface MemberDetailedStats extends MemberStats {
  monthlyData: MonthlyAnalytics[];
}

export interface ServiceStat {
  serviceId: string;
  serviceName: string;
  totalAppointments: number;
  completedAppointments: number;
  percentage: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface DayBreakdown {
  day: string;
  dayIndex: number;
  count: number;
}

export interface HourBreakdown {
  hour: number;
  count: number;
}

export interface TrendData {
  date: string;
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface OrganizationStats {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  pendingAppointments: number;
  totalClients: number;
  newClientsThisMonth: number;
  repeatClients: number;
  totalMembers: number;
  activeMembers: number;
  completionRate: number;
  noShowRate: number;
  cancelRate: number;
  averageAppointmentsPerDay: number;
  busiestDay: string;
  busiestHour: number;
  topServices: ServiceStat[];
  appointmentsByStatus: StatusBreakdown[];
  appointmentsByDayOfWeek: DayBreakdown[];
  appointmentsByHour: HourBreakdown[];
}

export interface OrganizationOverview extends OrganizationStats {
  monthlyAnalytics: MonthlyAnalytics[];
  memberStats: MemberStats[];
  dailyTrend: TrendData[];
}
