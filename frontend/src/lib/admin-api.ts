import { api } from './api';

// Admin Portal API - System Administration Endpoints

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface OrganizationQueryParams extends PaginationParams {
  industry?: string;
  status?: string;
}

export interface UsersQueryParams extends PaginationParams {
  organizationId?: string;
  role?: string;
}

export interface AppointmentsQueryParams extends PaginationParams {
  organizationId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemStats {
  totalOrganizations: number;
  totalUsers: number;
  totalAppointments: number;
  totalServices: number;
  totalClients: number;
  appointmentsByStatus: Record<string, number>;
  recentActivityCount: number;
  organizationsCreatedThisMonth: number;
  appointmentsThisMonth: number;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  size?: number;
  phone?: string;
  location?: string;
  website?: string;
  logo_url?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationDetails {
  organization: Organization;
  settings: OrganizationSettings | null;
  services: ServiceOption[];
  members: OrganizationMember[];
  bookingLinks: BookingLink[];
  stats: {
    totalAppointments: number;
    totalServices: number;
    totalMembers: number;
    totalClients: number;
  };
}

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  confirmationRequiredHours: number;
  confirmationDeadlineHours: number;
  autoCancelUnconfirmed: boolean;
  autoConfirmAppointments: boolean;
  bufferTimeMinutes: number;
  maxAppointmentsPerDay: number;
  minAdvanceBookingHours: number;
  maxAdvanceBookingDays: number;
  allowProviderSelection: boolean;
  autoAssignProvider: boolean;
  providerSelectionMode: string;
  showProviderNames: boolean;
  showProviderPhotos: boolean;
  welcomeMessage?: string;
  bookingInstructions?: string;
  confirmationMessage?: string;
  cancellationPolicy?: string;
  sendEmailReminders: boolean;
  sendSmsReminders: boolean;
  reminderHoursBefore: number;
  timezone: string;
  aiAssistantEnabled: boolean;
}

export interface ServiceOption {
  id: string;
  title: string;
  description?: string;
  duration: number;
  isActive: boolean;
  sortOrder: number;
  imageUrl?: string;
  organizationId?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingLink {
  id: string;
  name?: string;
  slug: string;
  type: string;
  isActive: boolean;
  expiresAt?: string;
  organizationId: string;
  serviceOptionId?: string;
  serviceOption?: ServiceOption;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  user?: {
    id: string;
    clerkId: string;
    email: string;
    businessName?: string;
    firstName?: string;
    lastName?: string;
  };
  clerkMember?: {
    userId: string;
    role: string;
    isAdmin: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
    imageUrl?: string;
  };
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  phone?: string;
  timezone?: string;
  activeOrganizationId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  status: string;
  notes?: string;
  createdAt: string;
  serviceOption?: ServiceOption;
  user?: User;
}

// Admin API functions
export const adminApi = {
  // Dashboard / Stats
  getSystemStats: () => api.get<SystemStats>('/admin/stats'),
  getRecentActivity: (limit?: number) =>
    api.get<Appointment[]>('/admin/activity', { params: { limit } }),

  // Organizations
  getAllOrganizations: (params?: OrganizationQueryParams) =>
    api.get<PaginatedResponse<Organization>>('/admin/organizations', { params }),
  getOrganization: (id: string) =>
    api.get<Organization>(`/admin/organizations/${id}`),
  getOrganizationDetails: (id: string) =>
    api.get<OrganizationDetails>(`/admin/organizations/${id}/details`),
  updateOrganization: (id: string, data: Partial<Organization>) =>
    api.patch<Organization>(`/admin/organizations/${id}`, data),
  deleteOrganization: (id: string) =>
    api.delete(`/admin/organizations/${id}`),

  // Organization Settings
  getOrganizationSettings: (id: string) =>
    api.get<OrganizationSettings>(`/admin/organizations/${id}/settings`),
  updateOrganizationSettings: (id: string, data: Partial<OrganizationSettings>) =>
    api.put<OrganizationSettings>(`/admin/organizations/${id}/settings`, data),

  // Organization Services
  getOrganizationServices: (id: string) =>
    api.get<ServiceOption[]>(`/admin/organizations/${id}/services`),
  createService: (organizationId: string, data: { title: string; description?: string; imageBase64?: string; duration: number }) =>
    api.post<ServiceOption>(`/admin/organizations/${organizationId}/services`, data),
  updateService: (id: string, data: Partial<ServiceOption>) =>
    api.patch<ServiceOption>(`/admin/services/${id}`, data),
  deleteService: (id: string) =>
    api.delete(`/admin/services/${id}`),

  // Service Provider Assignment
  getServiceProviders: (serviceId: string) =>
    api.get<Array<{ id: string; clerkId: string; firstName?: string; lastName?: string; imageUrl?: string; email: string }>>(`/admin/services/${serviceId}/providers`),
  bulkAssignProviders: (serviceId: string, memberIds: string[]) =>
    api.put<{ added: number; removed: number; total: number }>(`/admin/services/${serviceId}/providers`, { memberIds }),

  // Organization Booking Links
  getOrganizationBookingLinks: (id: string) =>
    api.get<BookingLink[]>(`/admin/organizations/${id}/booking-links`),
  deleteBookingLink: (id: string) =>
    api.delete(`/admin/booking-links/${id}`),

  // Users
  getAllUsers: (params?: UsersQueryParams) =>
    api.get<PaginatedResponse<User>>('/admin/users', { params }),
  getUser: (id: string) =>
    api.get<User>(`/admin/users/${id}`),
  getUserByClerkId: (clerkId: string) =>
    api.get<User>(`/admin/users/clerk/${clerkId}`),
  setUserAsSystemAdmin: (clerkId: string) =>
    api.post(`/admin/users/${clerkId}/set-admin`),
  removeSystemAdminRole: (clerkId: string) =>
    api.post(`/admin/users/${clerkId}/remove-admin`),
  updateUserMetadata: (clerkId: string, metadata: Record<string, any>) =>
    api.put(`/admin/users/${clerkId}/metadata`, metadata),

  // Appointments
  getAllAppointments: (params?: AppointmentsQueryParams) =>
    api.get<PaginatedResponse<Appointment>>('/admin/appointments', { params }),
  getAppointment: (id: string) =>
    api.get<Appointment>(`/admin/appointments/${id}`),
  updateAppointmentStatus: (id: string, status: string) =>
    api.patch<Appointment>(`/admin/appointments/${id}/status`, { status }),

  // WhatsApp Settings
  getWhatsAppSettings: (organizationId: string) =>
    api.get<WhatsAppSettings>(`/admin/organizations/${organizationId}/whatsapp`),
  updateWhatsAppSettings: (organizationId: string, data: { enabled: boolean; parameters: WhatsAppParameters }) =>
    api.put<WhatsAppSettings>(`/admin/organizations/${organizationId}/whatsapp`, data),
  connectWhatsApp: (organizationId: string, data: ConnectWhatsAppData) =>
    api.post<WhatsAppSettings>(`/admin/organizations/${organizationId}/whatsapp/connect`, data),
  disconnectWhatsApp: (organizationId: string) =>
    api.post<WhatsAppSettings>(`/admin/organizations/${organizationId}/whatsapp/disconnect`),
};

// WhatsApp Types
export interface WhatsAppParameters {
  appointmentCreated?: boolean;
  appointmentReminder?: boolean;
  appointmentCanceled?: boolean;
  appointmentRescheduled?: boolean;
}

export interface WhatsAppSettings {
  enabled: boolean;
  isConnected: boolean;
  displayPhoneNumber?: string;
  parameters: WhatsAppParameters;
  templates: Array<{
    id: string;
    eventType: string;
    templateName: string;
    languageCode: string;
    status: string;
  }>;
}

export interface ConnectWhatsAppData {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  tokenExpiresAt?: string;
  displayPhoneNumber?: string;
}
