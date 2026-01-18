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

// Service Options API
export const serviceOptionsApi = {
  getAll: () => api.get('/service-options'),
  getOne: (id: string) => api.get(`/service-options/${id}`),
  create: (data: { title: string; description?: string; imageUrl?: string; duration: number }) =>
    api.post('/service-options', data),
  update: (id: string, data: Partial<{ title: string; description: string; imageUrl: string; duration: number; isActive: boolean }>) =>
    api.put(`/service-options/${id}`, data),
  delete: (id: string) => api.delete(`/service-options/${id}`),
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
};

// Booking Links API
export const bookingLinksApi = {
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
  update: (id: string, data: Partial<{ startTime: string; status: string; clientName: string; clientEmail: string; clientPhone: string; notes: string }>) =>
    api.put(`/appointments/${id}`, data),
  cancel: (id: string) => api.put(`/appointments/${id}/cancel`),
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

// Public API (no auth required)
export const publicApi = {
  getBookingLink: (slug: string) => api.get(`/public/book/${slug}`),
  getAvailableSlots: (slug: string, serviceOptionId: string, date: string) =>
    api.get(`/public/book/${slug}/slots`, { params: { serviceOptionId, date } }),
  bookAppointment: (slug: string, data: {
    serviceOptionId: string;
    startTime: string;
    endTime: string;
    clientName: string;
    clientPhone: string;
    clientEmail?: string;
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
