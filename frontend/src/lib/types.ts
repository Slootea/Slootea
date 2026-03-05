export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  timezone?: string;
  imageUrl?: string;
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
  onboarded?: boolean;
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
  autoConfirmAppointments: boolean;
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
  // AI Assistant
  aiAssistantEnabled: boolean;
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
  aiAssistantEnabled?: boolean;
}

export interface PublicOrganizationInfo {
  name: string;
  logoUrl?: string | null;
}

export interface PublicBookingLink extends BookingLink {
  user: User;
  serviceOptions: ServiceOption[];
  settings?: PublicBookingSettings;
  organization?: PublicOrganizationInfo | null;
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

// WhatsApp Notification Settings Types
export enum WhatsAppEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
}

export enum WhatsAppTemplateStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface WhatsAppTemplate {
  id: string;
  eventType: WhatsAppEventType;
  templateName: string;
  languageCode: string;
  status: WhatsAppTemplateStatus;
}

export interface NotificationParameters {
  appointmentCreated: boolean;
  appointmentReminder: boolean;
  appointmentCanceled: boolean;
}

export interface WhatsAppNotificationSettings {
  enabled: boolean;
  isConnected: boolean;
  displayPhoneNumber?: string;
  templateLanguage: string;
  parameters: NotificationParameters;
  templates: WhatsAppTemplate[];
}

export interface UpdateWhatsAppSettingsPayload {
  enabled: boolean;
  parameters: Partial<NotificationParameters>;
  templateLanguage?: string;
}

export interface ConnectWhatsAppPayload {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  tokenExpiresAt?: string;
  displayPhoneNumber?: string;
}

export interface AssignWhatsAppTemplatePayload {
  eventType: WhatsAppEventType;
  templateName: string;
  languageCode: string;
}

// WhatsApp Business Template Types (Meta Graph API)
export enum WhatsAppTemplateCategory {
  UTILITY = 'UTILITY',
  MARKETING = 'MARKETING',
  AUTHENTICATION = 'AUTHENTICATION',
}

export interface WhatsAppTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY';
    text: string;
    phone_number?: string;
    url?: string;
  }>;
}

export interface WhatsAppBusinessTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: WhatsAppTemplateComponent[];
  rejectedReason?: string;
  qualityScore?: string;
  localEventType?: WhatsAppEventType;
}

export interface WhatsAppBusinessTemplatesListResponse {
  templates: WhatsAppBusinessTemplate[];
  isConnected: boolean;
}

export interface SyncTemplatesResponse {
  synced: number;
  templates: WhatsAppBusinessTemplate[];
}

export interface CreateWhatsAppBusinessTemplatePayload {
  name: string;
  language: string;
  category: WhatsAppTemplateCategory;
  components: WhatsAppTemplateComponent[];
}

export interface CreateTemplateFromMessagePayload {
  eventType: WhatsAppEventType;
  messageContent: string;
  language: string;
  templateName?: string;
}

export interface LinkTemplateToEventPayload {
  eventType: WhatsAppEventType;
  templateName: string;
  languageCode: string;
}

// Meta OAuth Types (WhatsApp Connection via Popup)
export interface MetaOAuthUrlResponse {
  authUrl: string;
  state: string;
}

export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  account_review_status?: string;
}

export interface WhatsAppPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
}

export interface WhatsAppAssetsResponse {
  whatsappBusinessAccounts: WhatsAppBusinessAccount[];
  phoneNumbers: Record<string, WhatsAppPhoneNumber[]>;
}

export interface CompleteMetaOAuthPayload {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
}

// Public Appointment Management Types
export interface PublicAppointmentDetails {
  id: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  status: AppointmentStatus;
  notes?: string;
  serviceOption: {
    id: string;
    title: string;
    duration: number;
  };
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    organizationId?: string;
  };
  canModify: boolean;
  canCancel: boolean;
  cancellationPolicy?: string;
  timezone?: string;
}

export interface UpdateAppointmentByTokenPayload {
  startTime?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
}

export interface CancelAppointmentByTokenPayload {
  reason?: string;
}

// AI Assistant Types
export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiSuggestedService {
  id: string;
  title: string;
  description: string;
  duration: number;
  imageBase64?: string;
  relevanceScore: number;
}

export interface AiAssistantChatRequest {
  message: string;
  history?: AiChatMessage[];
  organizationId: string;
}

export interface AiAssistantChatResponse {
  message: string;
  suggestedServices?: AiSuggestedService[];
  needsMoreInfo: boolean;
  responseType?: 'service' | 'message';
  serviceId?: string | null;
}

export interface AiStreamChunk {
  type: 'text' | 'services' | 'tool_call' | 'done' | 'error' | 'structured_response';
  content?: string;
  services?: AiSuggestedService[];
  tool?: string;
  args?: Record<string, unknown>;
  // Structured response fields
  responseType?: 'service' | 'message';
  serviceId?: string | null;
  message?: string;
  service?: {
    id: string;
    title: string;
    description: string;
    duration: number;
  };
}

// SMS Notification Settings Types (Verimor)
export enum SmsEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
}

export interface SmsTemplate {
  id: string;
  organizationId: string | null;
  eventType: SmsEventType;
  language: string;
  name: string;
  content: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmsNotificationSettings {
  enabled: boolean;
  isConnected: boolean;
  sourceAddr?: string;
  templateLanguage: string;
  useGlobalCredentials: boolean;
  templates: SmsTemplate[];
}

export interface UpdateSmsSettingsPayload {
  enabled?: boolean;
  templateLanguage?: string;
  useGlobalCredentials?: boolean;
}

export interface ConnectSmsPayload {
  username: string;
  password: string;
  sourceAddr: string;
}

export interface CreateSmsTemplatePayload {
  eventType: SmsEventType;
  language: string;
  name: string;
  content: string;
  isActive?: boolean;
}

export interface UpdateSmsTemplatePayload {
  name?: string;
  content?: string;
  isActive?: boolean;
}

