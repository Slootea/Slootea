import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
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
  create: (data: { title: string; description?: string; imageBase64?: string; duration: number }) =>
    api.post('/service-options', data),
  update: (id: string, data: Partial<{ title: string; description: string; imageBase64: string; duration: number; isActive: boolean }>) =>
    api.put(`/service-options/${id}`, data),
  delete: (id: string) => api.delete(`/service-options/${id}`),
  // Organization service options (admin)
  getAllForOrganization: () => api.get('/service-options/organization/all'),
  getActiveForOrganization: () => api.get('/service-options/organization/active'),
  getOneInOrganization: (id: string) => api.get(`/service-options/organization/${id}`),
  createForOrganization: (data: { title: string; description?: string; imageBase64?: string; duration: number }) =>
    api.post('/service-options/organization', data),
  updateInOrganization: (id: string, data: Partial<{ title: string; description: string; imageBase64: string; duration: number; isActive: boolean }>) =>
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
  // Bulk assign multiple members to a service (admin only)
  bulkAssignMembersToService: (serviceOptionId: string, memberIds: string[]) =>
    api.put(`/user-services/service/${serviceOptionId}/members`, { memberIds }),
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
  update: (id: string, data: Partial<{ startTime: string; status: string; clientName: string; clientEmail: string; clientPhone: string; notes: string }>) =>
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

// Gamification API (authenticated)
export const gamificationApi = {
  getSettings: () => api.get('/gamification/settings'),
  updateSettings: (data: {
    enabled?: boolean;
    pointsPerBooking?: number;
    pointsPerCompletedAppointment?: number;
    pointsPerReferral?: number;
    pointsForReferred?: number;
    streakBonusPoints?: number;
    bronzeThreshold?: number;
    silverThreshold?: number;
    goldThreshold?: number;
    platinumThreshold?: number;
    bronzeDiscount?: number;
    silverDiscount?: number;
    goldDiscount?: number;
    platinumDiscount?: number;
    spinWheelEnabled?: boolean;
    spinWheelPrizes?: any[];
    referralsEnabled?: boolean;
    maxReferralsPerClient?: number;
    virtualPetEnabled?: boolean;
  }) => api.put('/gamification/settings', data),
  getStats: () => api.get('/gamification/stats'),
  getClientGamification: (clientId: string) => api.get(`/gamification/clients/${clientId}`),
  updateClientGamification: (clientId: string, data: {
    totalPoints?: number;
    availablePoints?: number;
    level?: string;
    currentStreak?: number;
    longestStreak?: number;
  }) => api.put(`/gamification/clients/${clientId}`, data),
  adjustPoints: (clientId: string, data: { points: number; reason?: string }) =>
    api.post(`/gamification/clients/${clientId}/adjust-points`, data),
  getPointsHistory: (clientId: string, limit?: number) =>
    api.get(`/gamification/clients/${clientId}/history`, { params: { limit } }),
  getClientRewards: (clientId: string, includeRedeemed?: boolean) =>
    api.get(`/gamification/clients/${clientId}/rewards`, { params: { includeRedeemed } }),
  generateReferralCode: (clientId: string) =>
    api.post(`/gamification/clients/${clientId}/generate-referral`),
  redeemReward: (rewardId: string) =>
    api.post(`/gamification/rewards/${rewardId}/redeem`),
};

// Public Gamification API
export const publicGamificationApi = {
  getStatus: (slug: string) => api.get(`/public/gamification/${slug}/status`),
  lookupClient: (slug: string, phone: string) =>
    api.post(`/public/gamification/${slug}/lookup`, { phone }),
  validateReferral: (slug: string, referralCode: string, clientPhone?: string) =>
    api.post(`/public/gamification/${slug}/validate-referral${clientPhone ? `?clientPhone=${encodeURIComponent(clientPhone)}` : ''}`, { referralCode }),
  generateReferralCode: (slug: string, clientId: string) =>
    api.post(`/public/gamification/${slug}/generate-referral`, { clientId }),
  spinWheel: (slug: string, clientId: string) =>
    api.post(`/public/gamification/${slug}/spin`, { clientId }),
  getSpinWheelConfig: (slug: string) =>
    api.get(`/public/gamification/${slug}/spin-wheel-config`),
};

// Public Virtual Pet API
export const publicVirtualPetApi = {
  getStatus: (slug: string) => api.get(`/public/virtual-pet/${slug}/status`),
  getPet: (slug: string, clientId: string) =>
    api.get(`/public/virtual-pet/${slug}/${clientId}`),
  createPet: (slug: string, clientId: string, data: { name: string; type: string }) =>
    api.post(`/public/virtual-pet/${slug}/${clientId}`, data),
  feedPet: (slug: string, clientId: string, itemId: string) =>
    api.post(`/public/virtual-pet/${slug}/${clientId}/feed`, { itemId }),
  playWithPet: (slug: string, clientId: string, data: { toyId?: string; action?: string }) =>
    api.post(`/public/virtual-pet/${slug}/${clientId}/play`, data),
  getShop: (slug: string, clientId: string) =>
    api.get(`/public/virtual-pet/${slug}/${clientId}/shop`),
  buyItem: (slug: string, clientId: string, itemId: string, quantity?: number) =>
    api.post(`/public/virtual-pet/${slug}/${clientId}/buy`, { itemId, quantity }),
  getInventory: (slug: string, clientId: string) =>
    api.get(`/public/virtual-pet/${slug}/${clientId}/inventory`),
  placeItem: (slug: string, clientId: string, data: { itemId: string; x: number; y: number; rotation?: number }) =>
    api.post(`/public/virtual-pet/${slug}/${clientId}/place-item`, data),
  removeItem: (slug: string, clientId: string, itemId: string) =>
    api.delete(`/public/virtual-pet/${slug}/${clientId}/playground-item/${itemId}`),
  equipAccessory: (slug: string, clientId: string, itemId: string) =>
    api.post(`/public/virtual-pet/${slug}/${clientId}/equip/${itemId}`),
  updatePetName: (slug: string, clientId: string, name: string) =>
    api.put(`/public/virtual-pet/${slug}/${clientId}/name`, { name }),
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
