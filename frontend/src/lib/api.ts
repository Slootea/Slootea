import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Set organization context for requests
export const setOrganizationContext = (organizationId: string | null) => {
  if (organizationId) {
    api.defaults.headers.common['x-organization-id'] = organizationId;
  } else {
    delete api.defaults.headers.common['x-organization-id'];
  }
};

// Service Options API
export const serviceOptionsApi = {
  getAll: () => api.get('/service-options'),
  getOne: (id: string) => api.get(`/service-options/${id}`),
  create: (data: { title: string; description?: string; imageBase64?: string; duration: number; showPrice?: boolean; price?: number }) =>
    api.post('/service-options', data),
  update: (id: string, data: Partial<{ title: string; description: string; imageBase64: string; duration: number; showPrice: boolean; price: number; isActive: boolean }>) =>
    api.put(`/service-options/${id}`, data),
  delete: (id: string) => api.delete(`/service-options/${id}`),
  // Organization service options (admin)
  getAllForOrganization: () => api.get('/service-options/organization/all'),
  getActiveForOrganization: () => api.get('/service-options/organization/active'),
  getOneInOrganization: (id: string) => api.get(`/service-options/organization/${id}`),
  createForOrganization: (data: { title: string; description?: string; imageBase64?: string; duration: number; showPrice?: boolean; price?: number }) =>
    api.post('/service-options/organization', data),
  updateInOrganization: (id: string, data: Partial<{ title: string; description: string; imageBase64: string; duration: number; showPrice: boolean; price: number; isActive: boolean }>) =>
    api.put(`/service-options/organization/${id}`, data),
  deleteFromOrganization: (id: string) => api.delete(`/service-options/organization/${id}`),
};

// User-Service Options API (member service selection)
export const userServiceOptionsApi = {
  // Member self-service
  getMyServices: () => api.get('/user-services/my-services'),
  assignService: (data: { serviceOptionId: string; isActive?: boolean; customDuration?: number; customDescription?: string }) =>
    api.post('/user-services/my-services', data),
  bulkAssignServices: (serviceOptionIds: string[]) =>
    api.post('/user-services/my-services/bulk', { serviceOptionIds }),
  removeService: (serviceOptionId: string) =>
    api.delete(`/user-services/my-services/${serviceOptionId}`),
  updateService: (serviceOptionId: string, data: { isActive?: boolean; customDuration?: number; customDescription?: string }) =>
    api.put(`/user-services/my-services/${serviceOptionId}`, data),
  toggleService: (serviceOptionId: string) =>
    api.post(`/user-services/my-services/${serviceOptionId}/toggle`),
  // Admin endpoints
  getMemberServices: (memberId: string) => api.get(`/user-services/members/${memberId}`),
  assignServiceToMember: (memberId: string, data: { serviceOptionId: string; isActive?: boolean }) =>
    api.post(`/user-services/members/${memberId}`, data),
  removeServiceFromMember: (memberId: string, serviceOptionId: string) =>
    api.delete(`/user-services/members/${memberId}/${serviceOptionId}`),
  getProvidersForService: (serviceOptionId: string) =>
    api.get(`/user-services/service/${serviceOptionId}/providers`),
  // Bulk assign multiple members to a service (admin only) - deprecated
  bulkAssignMembersToService: (serviceOptionId: string, memberIds: string[]) =>
    api.put(`/user-services/service/${serviceOptionId}/members`, { memberIds }),
  // Bulk assign all providers (members + external) to a service (admin only)
  bulkAssignProvidersToService: (serviceOptionId: string, data: { memberIds: string[]; externalProviderIds: string[] }) =>
    api.put(`/user-services/service/${serviceOptionId}/providers`, data),
};

// External Providers API (admin only)
export const externalProvidersApi = {
  // CRUD
  getAll: () => api.get('/external-providers'),
  getOne: (id: string) => api.get(`/external-providers/${id}`),
  create: (data: { name: string; imageBase64?: string; isActive?: boolean }) =>
    api.post('/external-providers', data),
  update: (id: string, data: Partial<{ name: string; imageBase64: string; isActive: boolean }>) =>
    api.put(`/external-providers/${id}`, data),
  delete: (id: string) => api.delete(`/external-providers/${id}`),
  
  // Service assignment
  getAssignedServices: (id: string) => api.get(`/external-providers/${id}/services`),
  assignServices: (id: string, serviceOptionIds: string[]) =>
    api.put(`/external-providers/${id}/services`, { serviceOptionIds }),
  
  // Availability management
  getAvailability: (id: string) => api.get(`/external-providers/${id}/availability`),
  createAvailability: (id: string, data: { dayOfWeek: number; startTime: string; endTime: string; serviceOptionId?: string }) =>
    api.post(`/external-providers/${id}/availability`, data),
  createBulkAvailability: (id: string, data: { availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string; serviceOptionId?: string }> }) =>
    api.post(`/external-providers/${id}/availability/bulk`, data),
  updateAvailability: (id: string, availabilityId: string, data: Partial<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>) =>
    api.put(`/external-providers/${id}/availability/${availabilityId}`, data),
  deleteAvailability: (id: string, availabilityId: string) =>
    api.delete(`/external-providers/${id}/availability/${availabilityId}`),
  clearAllAvailability: (id: string) => api.delete(`/external-providers/${id}/availability`),
  
  // Blocked times management
  getBlockedTimes: (id: string) => api.get(`/external-providers/${id}/blocked-times`),
  createBlockedTime: (id: string, data: { date: string; startTime?: string; endTime?: string; isFullDay?: boolean; reason?: string }) =>
    api.post(`/external-providers/${id}/blocked-times`, data),
  deleteBlockedTime: (id: string, blockedTimeId: string) =>
    api.delete(`/external-providers/${id}/blocked-times/${blockedTimeId}`),
};

// Availability API
export const availabilityApi = {
  getAll: () => api.get('/availability'),
  create: (data: { dayOfWeek: number; startTime: string; endTime: string; serviceOptionId?: string }) =>
    api.post('/availability', data),
  createBulk: (data: { availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string; serviceOptionId?: string }> }) =>
    api.post('/availability/bulk', data),
  update: (id: string, data: Partial<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>) =>
    api.put(`/availability/${id}`, data),
  delete: (id: string) => api.delete(`/availability/${id}`),
  deleteAll: () => api.delete('/availability'),
  // Admin endpoints
  getForMember: (memberId: string) => api.get(`/availability/admin/member/${memberId}`),
  createForMember: (memberId: string, data: { dayOfWeek: number; startTime: string; endTime: string; serviceOptionId?: string }) =>
    api.post(`/availability/admin/member/${memberId}`, data),
  createBulkForMember: (memberId: string, data: { availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string; serviceOptionId?: string }> }) =>
    api.post(`/availability/admin/member/${memberId}/bulk`, data),
  updateAsAdmin: (id: string, data: Partial<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>) =>
    api.put(`/availability/admin/${id}`, data),
  deleteAsAdmin: (id: string) => api.delete(`/availability/admin/${id}`),
  deleteAllForMember: (memberId: string) => api.delete(`/availability/admin/member/${memberId}/all`),
};

// Blocked Times API
export const blockedTimesApi = {
  getAll: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/blocked-times', { params }),
  create: (data: { date: string; startTime?: string; endTime?: string; isFullDay?: boolean; reason?: string }) =>
    api.post('/blocked-times', data),
  update: (id: string, data: Partial<{ date: string; startTime: string; endTime: string; isFullDay: boolean; reason: string }>) =>
    api.put(`/blocked-times/${id}`, data),
  delete: (id: string) => api.delete(`/blocked-times/${id}`),
  // Admin endpoints
  getForMember: (memberId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/blocked-times/admin/member/${memberId}`, { params }),
  createForMember: (memberId: string, data: { date: string; startTime?: string; endTime?: string; isFullDay?: boolean; reason?: string }) =>
    api.post(`/blocked-times/admin/member/${memberId}`, data),
  deleteAsAdmin: (id: string) => api.delete(`/blocked-times/admin/${id}`),
};

// Booking Links API (Organization only)
export const bookingLinksApi = {
  // All booking links require organization context
  getAll: () => api.get('/booking-links'),
  getOne: (id: string) => api.get(`/booking-links/${id}`),
  create: (data: { name?: string; type: string; serviceOptionId?: string; expiresAt?: string }) =>
    api.post('/booking-links', data),
  update: (id: string, data: Partial<{ name: string; isActive: boolean; expiresAt: string }>) =>
    api.put(`/booking-links/${id}`, data),
  delete: (id: string) => api.delete(`/booking-links/${id}`),
};

// Appointments API
export const appointmentsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    serviceOptionId?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) => api.get('/appointments', { params }),
  getToday: () => api.get('/appointments/today'),
  getUpcoming: () => api.get('/appointments/upcoming'),
  getNext: () => api.get('/appointments/next'),
  getPending: () => api.get('/appointments/pending'),
  getStats: () => api.get('/appointments/stats'),
  getOne: (id: string) => api.get(`/appointments/${id}`),
  getNextAvailable: (params: {
    serviceOptionId: string;
    providerId?: string;
    fromDate?: string;
  }) => api.get('/appointments/next-available', { params }),
  checkAvailability: (data: {
    serviceOptionId: string;
    startTime: string;
    providerId?: string;
  }) => api.post('/appointments/check-availability', data),
  create: (data: {
    startTime: string;
    serviceOptionId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    providerId?: string;
    notes?: string;
  }) => api.post('/appointments', data),
  update: (id: string, data: Partial<{ startTime: string; status: string; clientName: string; clientEmail: string; clientPhone: string; notes: string; sendNotification: boolean }>) =>
    api.put(`/appointments/${id}`, data),
  cancel: (id: string) => api.put(`/appointments/${id}/cancel`),
  confirm: (id: string) => api.put(`/appointments/${id}/confirm`),
  complete: (id: string) => api.put(`/appointments/${id}/complete`),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Partial<{
    confirmationRequiredHours: number;
    confirmationDeadlineHours: number;
    autoCancelUnconfirmed: boolean;
    bufferTimeMinutes: number;
    maxAppointmentsPerDay: number;
    minAdvanceBookingHours: number;
    maxAdvanceBookingDays: number;
  }>) => api.put('/settings', data),
};

// Organization Settings API
export const organizationSettingsApi = {
  get: () => api.get('/organization-settings'),
  update: (data: Partial<{
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
    providerSelectionMode: 'client_chooses' | 'auto_assign';
    showProviderNames: boolean;
    showProviderPhotos: boolean;
    welcomeMessage: string;
    bookingInstructions: string;
    confirmationMessage: string;
    cancellationPolicy: string;
    sendEmailReminders: boolean;
    sendSmsReminders: boolean;
    reminderHoursBefore: number;
    timezone: string;
    currency: string;
    aiAssistantEnabled: boolean;
  }>) => api.put('/organization-settings', data),
  getPublic: (organizationId: string) => api.get(`/organization-settings/public/${organizationId}`),
};

// Organizations API
export const organizationsApi = {
  getAll: () => api.get('/organizations'),
  getOne: (id: string) => api.get(`/organizations/${id}`),
  create: (data: { name: string; description?: string; industry: string }) =>
    api.post('/organizations', data),
  update: (id: string, data: Partial<{ name: string; description: string; industry: string; website: string; location: string }>) =>
    api.patch(`/organizations/${id}`, data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
  // Members
  getMembers: (id: string) => api.get(`/organizations/${id}/members`),
  inviteUser: (id: string, email: string) => api.post(`/organizations/${id}/invite`, { email }),
  updateMemberRole: (id: string, memberId: string, role: string) =>
    api.patch(`/organizations/${id}/members/${memberId}`, { role }),
  removeMember: (id: string, memberId: string) => api.delete(`/organizations/${id}/members/${memberId}`),
  getMyRole: (id: string) => api.get(`/organizations/${id}/my-role`),
  // Onboarding
  getOnboardingStatus: (id: string) => api.get(`/organizations/${id}/onboarding-status`),
  completeOnboarding: (id: string) => api.post(`/organizations/${id}/complete-onboarding`),
};

// Public API (no auth required)
export const publicApi = {
  getBookingLink: (slug: string) => api.get(`/public/book/${slug}`),
  getAvailableSlots: (slug: string, serviceOptionId: string, date: string, providerId?: string) =>
    api.get(`/public/book/${slug}/slots`, { params: { serviceOptionId, date, providerId } }),
  getAvailableDates: (slug: string, serviceOptionId: string, month: string, providerId?: string) =>
    api.get(`/public/book/${slug}/available-dates`, { params: { serviceOptionId, month, providerId } }),
  getProviders: (slug: string, serviceOptionId: string) =>
    api.get(`/public/book/${slug}/providers`, { params: { serviceOptionId } }),
  bookAppointment: (slug: string, data: {
    serviceOptionId: string;
    startTime: string;
    endTime: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
    providerId?: string;
    notes?: string;
  }) => api.post(`/public/book/${slug}`, data),
  getAppointmentByToken: (token: string) => api.get(`/public/confirm/${token}`),
  confirmAppointment: (token: string) => api.post(`/public/confirm/${token}`),
  // Appointment management endpoints (for clients)
  getAppointmentForManagement: (token: string) => api.get(`/public/appointment/${token}`),
  updateAppointmentByToken: (token: string, data: {
    startTime?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    notes?: string;
  }) => api.put(`/public/appointment/${token}`, data),
  cancelAppointmentByToken: (token: string, reason?: string) =>
    api.post(`/public/appointment/${token}/cancel`, { reason }),
  getAvailableSlotsForReschedule: (token: string, date: string) =>
    api.get(`/public/appointment/${token}/available-slots`, { params: { date } }),
  getAvailableDatesForReschedule: (token: string, month: string) =>
    api.get(`/public/appointment/${token}/available-dates`, { params: { month } }),
  // AI Assistant
  aiAssistantChat: (data: { message: string; history?: { role: 'user' | 'assistant'; content: string }[]; organizationId: string }) =>
    api.post('/public/ai-assistant/chat', data),
  aiAssistantChatStream: (data: { message: string; history?: { role: 'user' | 'assistant'; content: string }[]; organizationId: string }) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return fetch(`${API_URL}/public/ai-assistant/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
};

// Users API
export const usersApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: Partial<{ firstName: string; lastName: string; businessName: string; phone: string; timezone: string }>) =>
    api.put('/users/me', data),
};

// Clients API
export const clientsApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) => api.get('/clients', { params }),
  getStats: () => api.get('/clients/stats'),
  getOne: (id: string) => api.get(`/clients/${id}`),
  getAppointments: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/clients/${id}/appointments`, { params }),
  create: (data: { name: string; email?: string; phone: string; notes?: string }) =>
    api.post('/clients', data),
  update: (id: string, data: Partial<{ name: string; email: string; notes: string }>) =>
    api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Client Penalties API
export const clientPenaltiesApi = {
  getActive: () => api.get('/client-penalties'),
  getAll: () => api.get('/client-penalties/all'),
  getByClient: (clientId: string) => api.get(`/client-penalties/client/${clientId}`),
  getActiveByClient: (clientId: string) => api.get(`/client-penalties/client/${clientId}/active`),
  create: (data: { clientId: string; type: 'ban' | 'suspension'; reason?: string; expiresAt?: string }) =>
    api.post('/client-penalties', data),
  remove: (penaltyId: string, data?: { removalReason?: string }) =>
    api.delete(`/client-penalties/${penaltyId}`, { data }),
};

// Reports API (Admin only)
export const reportsApi = {
  getOverview: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/overview', { params }),
  getStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/stats', { params }),
  getMemberStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/members', { params }),
  getMemberDetailedStats: (memberId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/reports/members/${memberId}`, { params }),
  getMonthlyAnalytics: (months?: number) =>
    api.get('/reports/monthly', { params: { months } }),
  getDailyTrend: (days?: number) =>
    api.get('/reports/daily-trend', { params: { days } }),
  getServiceAnalytics: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/services', { params }),
};

// Notification Settings API (WhatsApp Configuration)
export const notificationSettingsApi = {
  // Get WhatsApp notification settings
  getWhatsAppSettings: (orgId: string) =>
    api.get(`/organizations/${orgId}/notification-settings/whatsapp`),
  
  // Update WhatsApp enabled status and notification parameters
  updateWhatsAppSettings: (orgId: string, data: {
    enabled: boolean;
    parameters: {
      appointmentCreated?: boolean;
      appointmentReminder?: boolean;
      appointmentCanceled?: boolean;
      appointmentRescheduled?: boolean;
    };
    templateLanguage?: string;
  }) => api.put(`/organizations/${orgId}/notification-settings/whatsapp`, data),
  
  // Connect WhatsApp Business Account
  // Called after completing Meta's Embedded Signup flow with the obtained credentials
  connectWhatsApp: (orgId: string, data: {
    wabaId: string;
    phoneNumberId: string;
    accessToken: string;
    tokenExpiresAt?: string;
    displayPhoneNumber?: string;
  }) => api.post(`/organizations/${orgId}/notification-settings/whatsapp/connect`, data),
  
  // Disconnect WhatsApp Business Account
  disconnectWhatsApp: (orgId: string) =>
    api.post(`/organizations/${orgId}/notification-settings/whatsapp/disconnect`),
  
  // Assign WhatsApp template to event type
  assignTemplate: (orgId: string, data: {
    eventType: string;
    templateName: string;
    languageCode: string;
  }) => api.post(`/organizations/${orgId}/notification-settings/whatsapp/templates`, data),
  
  // Delete template assignment
  deleteTemplate: (orgId: string, templateId: string) =>
    api.delete(`/organizations/${orgId}/notification-settings/whatsapp/templates/${templateId}`),
  
  // ==================== WhatsApp Business Templates (Meta Graph API) ====================
  
  // List all WhatsApp Business templates from Meta
  listBusinessTemplates: (orgId: string) =>
    api.get(`/organizations/${orgId}/notification-settings/whatsapp/business-templates`),
  
  // Create a new WhatsApp Business template in Meta
  createBusinessTemplate: (orgId: string, data: {
    name: string;
    language: string;
    category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
    components: Array<{
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
    }>;
  }) => api.post(`/organizations/${orgId}/notification-settings/whatsapp/business-templates`, data),
  
  // Create a WhatsApp Business template from local message content
  createBusinessTemplateFromMessage: (orgId: string, data: {
    eventType: string;
    messageContent: string;
    language: string;
    templateName?: string;
  }) => api.post(`/organizations/${orgId}/notification-settings/whatsapp/business-templates/from-message`, data),
  
  // Update a WhatsApp Business template in Meta
  updateBusinessTemplate: (orgId: string, templateId: string, data: {
    components: Array<{
      type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
      format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
      text?: string;
      example?: {
        header_text?: string[];
        body_text?: string[][];
      };
    }>;
  }) => api.put(`/organizations/${orgId}/notification-settings/whatsapp/business-templates/${templateId}`, data),
  
  // Delete a WhatsApp Business template from Meta
  deleteBusinessTemplate: (orgId: string, templateName: string) =>
    api.delete(`/organizations/${orgId}/notification-settings/whatsapp/business-templates/${templateName}`),
  
  // Sync templates from Meta to local database
  syncBusinessTemplates: (orgId: string) =>
    api.post(`/organizations/${orgId}/notification-settings/whatsapp/business-templates/sync`),
  
  // Link an existing Meta template to a local event type
  linkTemplateToEvent: (orgId: string, data: {
    eventType: string;
    templateName: string;
    languageCode: string;
  }) => api.post(`/organizations/${orgId}/notification-settings/whatsapp/business-templates/link`, data),
};

// SMS Notification Settings API (Verimor SMS)
export const smsSettingsApi = {
  // Get SMS notification settings
  getSettings: (orgId: string) =>
    api.get(`/organizations/${orgId}/notification-settings/sms`),
  
  // Update SMS enabled status and settings
  updateSettings: (orgId: string, data: {
    enabled?: boolean;
    templateLanguage?: string;
    useGlobalCredentials?: boolean;
  }) => api.put(`/organizations/${orgId}/notification-settings/sms`, data),
  
  // Connect SMS with custom Verimor credentials
  connect: (orgId: string, data: {
    username: string;
    password: string;
    sourceAddr: string;
  }) => api.post(`/organizations/${orgId}/notification-settings/sms/connect`, data),
  
  // Disconnect SMS (clear custom credentials)
  disconnect: (orgId: string) =>
    api.post(`/organizations/${orgId}/notification-settings/sms/disconnect`),
  
  // Get all SMS templates for organization
  getTemplates: (orgId: string) =>
    api.get(`/organizations/${orgId}/notification-settings/sms/templates`),
  
  // Create a new SMS template
  createTemplate: (orgId: string, data: {
    eventType: string;
    language: string;
    name: string;
    content: string;
    isActive?: boolean;
  }) => api.post(`/organizations/${orgId}/notification-settings/sms/templates`, data),
  
  // Update an existing SMS template
  updateTemplate: (orgId: string, templateId: string, data: {
    name?: string;
    content?: string;
    isActive?: boolean;
  }) => api.put(`/organizations/${orgId}/notification-settings/sms/templates/${templateId}`, data),
  
  // Delete an SMS template
  deleteTemplate: (orgId: string, templateId: string) =>
    api.delete(`/organizations/${orgId}/notification-settings/sms/templates/${templateId}`),
};

// Meta OAuth API (WhatsApp Connection via Popup)
export const metaOAuthApi = {
  // Generate OAuth URL for Meta login popup
  getOAuthUrl: (orgId: string, redirectUri?: string) =>
    api.get(`/auth/meta/organizations/${orgId}/oauth-url`, {
      params: redirectUri ? { redirectUri } : undefined,
    }),
  
  // Get available WhatsApp Business assets after OAuth
  getWhatsAppAssets: (orgId: string) =>
    api.get(`/auth/meta/organizations/${orgId}/whatsapp-assets`),
  
  // Complete OAuth connection with selected assets
  completeConnection: (orgId: string, data: {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber?: string;
  }) => api.post(`/auth/meta/organizations/${orgId}/complete`, {
    organizationId: orgId,
    ...data,
  }),
  
  // Check if there's a pending OAuth session
  hasPendingSession: (orgId: string) =>
    api.get(`/auth/meta/organizations/${orgId}/pending-session`),
  
  // Cancel pending OAuth session
  cancelSession: (orgId: string) =>
    api.post(`/auth/meta/organizations/${orgId}/cancel-session`),
};

// ==================== Inventory Types ====================

export type InventoryCategory = 'consumable' | 'retail';

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  category: InventoryCategory;
  unit: string;
  currentStock: number;
  minStockAlert: number;
  costPerUnit?: number;
  retailPrice?: number;
  imageBase64?: string;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedInventoryResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LowStockSummary {
  totalLowStockItems: number;
  items: InventoryItem[];
}

export interface StockAdjustment {
  id: string;
  inventoryItemId: string;
  type: 'manual' | 'appointment' | 'purchase' | 'correction';
  quantity: number;
  stockAfter: number;
  reason?: string;
  appointmentId?: string;
  adjustedBy?: string;
  createdAt: string;
}

export interface ServiceInventoryUsage {
  id: string;
  serviceOptionId: string;
  inventoryItemId: string;
  quantityUsed: number;
  inventoryItem?: InventoryItem;
}

export interface DailyUsageData {
  date: string;
  used: number;
  added: number;
  netChange: number;
}

export interface ItemUsageReport {
  itemId: string;
  itemName: string;
  unit: string;
  dailyData: DailyUsageData[];
  totalUsed: number;
  totalAdded: number;
}

export interface DailyUsageReport {
  items: ItemUsageReport[];
  startDate: string;
  endDate: string;
}

// ==================== Inventory API ====================

export const inventoryApi = {
  // CRUD
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: InventoryCategory;
    isActive?: boolean;
    lowStock?: boolean;
  }) => api.get<PaginatedInventoryResponse>('/inventory', { params }),
  
  getOne: (id: string) => api.get<InventoryItem>(`/inventory/${id}`),
  
  create: (data: {
    name: string;
    sku?: string;
    description?: string;
    category?: InventoryCategory;
    unit?: string;
    currentStock?: number;
    minStockAlert?: number;
    costPerUnit?: number;
    retailPrice?: number;
    imageBase64?: string;
    isActive?: boolean;
  }) => api.post<InventoryItem>('/inventory', data),
  
  update: (id: string, data: Partial<{
    name: string;
    sku: string;
    description: string;
    category: InventoryCategory;
    unit: string;
    minStockAlert: number;
    costPerUnit: number;
    retailPrice: number;
    imageBase64: string;
    isActive: boolean;
  }>) => api.put<InventoryItem>(`/inventory/${id}`, data),
  
  delete: (id: string) => api.delete(`/inventory/${id}`),
  
  // Stock management
  getLowStock: () => api.get<LowStockSummary>('/inventory/low-stock'),
  
  adjustStock: (id: string, data: {
    quantity: number;
    type?: 'manual' | 'purchase' | 'correction';
    reason?: string;
  }) => api.post<InventoryItem>(`/inventory/${id}/adjust`, data),
  
  getStockHistory: (id: string, limit?: number) =>
    api.get<StockAdjustment[]>(`/inventory/${id}/history`, { params: { limit } }),
  
  // Service inventory usage
  getServiceUsage: (serviceOptionId: string) =>
    api.get<ServiceInventoryUsage[]>(`/inventory/service/${serviceOptionId}/usage`),
  
  updateServiceUsage: (serviceOptionId: string, items: Array<{
    inventoryItemId: string;
    quantityUsed: number;
  }>) => api.put<ServiceInventoryUsage[]>(`/inventory/service/${serviceOptionId}/usage`, { items }),
  
  // Reports
  getDailyUsageReport: (params: {
    startDate: string;
    endDate: string;
    itemId?: string;
    category?: InventoryCategory;
  }) => api.get<DailyUsageReport>('/inventory/reports/daily-usage', { params }),
};

// ==================== Inventory Automation Types ====================

export type AutomationNodeType =
  | 'trigger_stock_critical'
  | 'trigger_stock_out'
  | 'trigger_stock_adjusted'
  | 'trigger_manual'
  | 'condition_stock_level'
  | 'condition_item_category'
  | 'action_api_call'
  | 'action_webhook'
  | 'action_notification'
  | 'action_adjust_stock';

export interface NodePosition {
  x: number;
  y: number;
}

export interface AutomationNode {
  id: string;
  workflowId: string;
  type: AutomationNodeType;
  label?: string;
  config: Record<string, unknown>;
  position: NodePosition;
  nextNodeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationWorkflow {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isActive: boolean;
  nodes: AutomationNode[];
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'partial';

export interface NodeExecutionResult {
  nodeId: string;
  nodeType: string;
  status: 'success' | 'error' | 'skipped';
  startedAt: string;
  completedAt?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface AutomationExecution {
  id: string;
  organizationId: string;
  workflowId: string;
  workflow?: AutomationWorkflow;
  status: ExecutionStatus;
  context: {
    triggeredBy: 'system' | 'manual';
    triggerData?: {
      inventoryItemId?: string;
      inventoryItemName?: string;
      currentStock?: number;
      minStockAlert?: number;
      adjustmentType?: string;
      adjustmentQuantity?: number;
    };
  };
  nodeResults: NodeExecutionResult[];
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface NodeTypeInfo {
  type: AutomationNodeType;
  label: string;
  description: string;
  configSchema: Record<string, unknown>;
}

export interface NodeTypesResponse {
  triggers: NodeTypeInfo[];
  conditions: NodeTypeInfo[];
  actions: NodeTypeInfo[];
}

// ==================== Inventory Automation API ====================

export const automationApi = {
  // Workflows
  getWorkflows: () =>
    api.get<AutomationWorkflow[]>('/inventory/automation/workflows'),

  getWorkflow: (id: string) =>
    api.get<AutomationWorkflow>(`/inventory/automation/workflows/${id}`),

  createWorkflow: (data: {
    name: string;
    description?: string;
    isActive?: boolean;
    nodes?: Array<{
      type: AutomationNodeType;
      label?: string;
      config: Record<string, unknown>;
      position: NodePosition;
      nextNodeIds?: string[];
    }>;
  }) => api.post<AutomationWorkflow>('/inventory/automation/workflows', data),

  updateWorkflow: (id: string, data: {
    name?: string;
    description?: string;
    isActive?: boolean;
  }) => api.put<AutomationWorkflow>(`/inventory/automation/workflows/${id}`, data),

  deleteWorkflow: (id: string) =>
    api.delete(`/inventory/automation/workflows/${id}`),

  // Canvas save (replaces all nodes)
  saveWorkflowCanvas: (workflowId: string, data: {
    name?: string;
    description?: string;
    nodes: Array<{
      type: AutomationNodeType;
      label?: string;
      config: Record<string, unknown>;
      position: NodePosition;
      nextNodeIds?: string[];
    }>;
  }) => api.put<AutomationWorkflow>(`/inventory/automation/workflows/${workflowId}/canvas`, data),

  // Node operations
  addNode: (workflowId: string, data: {
    type: AutomationNodeType;
    label?: string;
    config: Record<string, unknown>;
    position: NodePosition;
    nextNodeIds?: string[];
  }) => api.post<AutomationNode>(`/inventory/automation/workflows/${workflowId}/nodes`, data),

  updateNode: (workflowId: string, nodeId: string, data: {
    type?: AutomationNodeType;
    label?: string;
    config?: Record<string, unknown>;
    position?: NodePosition;
    nextNodeIds?: string[];
  }) => api.put<AutomationNode>(`/inventory/automation/workflows/${workflowId}/nodes/${nodeId}`, data),

  deleteNode: (workflowId: string, nodeId: string) =>
    api.delete(`/inventory/automation/workflows/${workflowId}/nodes/${nodeId}`),

  // Execution
  triggerWorkflow: (workflowId: string, data?: {
    triggerData?: {
      inventoryItemId?: string;
      inventoryItemName?: string;
      currentStock?: number;
      minStockAlert?: number;
      adjustmentType?: string;
      adjustmentQuantity?: number;
    };
  }) => api.post<AutomationExecution>(`/inventory/automation/workflows/${workflowId}/trigger`, data || {}),

  getExecutionHistory: (params?: {
    workflowId?: string;
    limit?: number;
  }) => api.get<AutomationExecution[]>('/inventory/automation/executions', { params }),

  getExecution: (id: string) =>
    api.get<AutomationExecution>(`/inventory/automation/executions/${id}`),

  // Node types reference
  getNodeTypes: () =>
    api.get<NodeTypesResponse>('/inventory/automation/node-types'),
};
