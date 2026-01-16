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
  imageUrl?: string;
  duration: number;
  isActive: boolean;
  sortOrder: number;
  userId: string;
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
  userId: string;
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
  status: AppointmentStatus;
  confirmationToken: string;
  confirmedAt?: string;
  reminderSentAt?: string;
  notes?: string;
  userId: string;
  serviceOptionId: string;
  serviceOption?: ServiceOption;
  bookingLinkId?: string;
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
}

export interface PublicBookingLink extends BookingLink {
  user: User;
  serviceOptions: ServiceOption[];
}
