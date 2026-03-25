/**
 * Google Analytics Event Tracking Utility
 * 
 * Centralized helper for tracking GA4 events with consistent structure.
 * Automatically includes user and organization context when available.
 */

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Event names enum for type safety
export const AnalyticsEvents = {
  // Authentication
  SIGN_IN: 'sign_in',
  SIGN_UP: 'sign_up',
  
  // Public Booking Flow
  BOOKING_LINK_VIEW: 'booking_link_view',
  SERVICE_SELECTED: 'service_selected',
  AI_ASSISTANT_USED: 'ai_assistant_used',
  SLOT_SELECTED: 'slot_selected',
  PROVIDER_SELECTED: 'provider_selected',
  APPOINTMENT_BOOKED: 'appointment_booked',
  BOOKING_COMPLETED: 'booking_completed',
  
  // Appointment Confirmation
  CONFIRMATION_PAGE_VIEW: 'confirmation_page_view',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  
  // Dashboard/Business Events
  DASHBOARD_VIEW: 'dashboard_view',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  BOOKING_LINK_COPIED: 'booking_link_copied',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

// Organization context for events
export interface OrganizationContext {
  organization_id?: string;
  organization_name?: string;
}

// User context for events
export interface UserContext {
  user_clerk_id?: string;
}

// Base event parameters
export interface BaseEventParams extends OrganizationContext, UserContext {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track a Google Analytics event
 * 
 * @param eventName - The name of the event to track
 * @param params - Event parameters including organization and user context
 */
export function trackEvent(
  eventName: AnalyticsEventName | string,
  params: BaseEventParams = {}
): void {
  if (typeof window === 'undefined' || !window.gtag) {
    // Not in browser or gtag not loaded
    console.debug(`[Analytics] Event not sent (gtag not available): ${eventName}`, params);
    return;
  }

  // Filter out undefined values
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  );

  // Send to GA4
  window.gtag('event', eventName, cleanParams);

  // Debug log in development
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics] Event: ${eventName}`, cleanParams);
  }
}

/**
 * Track a page view event (useful for SPA navigation)
 * 
 * @param pagePath - The path of the page
 * @param pageTitle - The title of the page
 * @param params - Additional parameters
 */
export function trackPageView(
  pagePath: string,
  pageTitle?: string,
  params: BaseEventParams = {}
): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle,
    ...params,
  });

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics] Page View: ${pagePath}`, { pageTitle, ...params });
  }
}

// ============================================
// Pre-built event tracking functions
// ============================================

/**
 * Track sign in event
 */
export function trackSignIn(userClerkId: string, orgContext?: OrganizationContext): void {
  trackEvent(AnalyticsEvents.SIGN_IN, {
    user_clerk_id: userClerkId,
    ...orgContext,
  });
}

/**
 * Track sign up event (first time user)
 */
export function trackSignUp(userClerkId: string, orgContext?: OrganizationContext): void {
  trackEvent(AnalyticsEvents.SIGN_UP, {
    user_clerk_id: userClerkId,
    ...orgContext,
  });
}

/**
 * Track booking link page view
 */
export function trackBookingLinkView(params: {
  bookingLinkSlug: string;
  organizationId?: string;
  organizationName?: string;
  businessName?: string;
}): void {
  trackEvent(AnalyticsEvents.BOOKING_LINK_VIEW, {
    booking_link_slug: params.bookingLinkSlug,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
    business_name: params.businessName,
  });
}

/**
 * Track service selection
 */
export function trackServiceSelected(params: {
  serviceId: string;
  serviceName: string;
  organizationId?: string;
  organizationName?: string;
  bookingLinkSlug?: string;
}): void {
  trackEvent(AnalyticsEvents.SERVICE_SELECTED, {
    service_id: params.serviceId,
    service_name: params.serviceName,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
    booking_link_slug: params.bookingLinkSlug,
  });
}

/**
 * Track AI assistant usage
 */
export function trackAiAssistantUsed(params: {
  organizationId?: string;
  organizationName?: string;
  query?: string;
}): void {
  trackEvent(AnalyticsEvents.AI_ASSISTANT_USED, {
    organization_id: params.organizationId,
    organization_name: params.organizationName,
    // Don't include full query for privacy, just track usage
    has_query: params.query ? true : false,
  });
}

/**
 * Track slot selection
 */
export function trackSlotSelected(params: {
  date: string;
  time: string;
  serviceId: string;
  organizationId?: string;
  organizationName?: string;
}): void {
  trackEvent(AnalyticsEvents.SLOT_SELECTED, {
    slot_date: params.date,
    slot_time: params.time,
    service_id: params.serviceId,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
  });
}

/**
 * Track provider selection
 */
export function trackProviderSelected(params: {
  providerId: string;
  providerName?: string;
  organizationId?: string;
  organizationName?: string;
}): void {
  trackEvent(AnalyticsEvents.PROVIDER_SELECTED, {
    provider_id: params.providerId,
    provider_name: params.providerName,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
  });
}

/**
 * Track successful appointment booking
 */
export function trackAppointmentBooked(params: {
  serviceId: string;
  serviceName: string;
  organizationId?: string;
  organizationName?: string;
  bookingLinkSlug?: string;
  providerId?: string;
  appointmentDate?: string;
}): void {
  trackEvent(AnalyticsEvents.APPOINTMENT_BOOKED, {
    service_id: params.serviceId,
    service_name: params.serviceName,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
    booking_link_slug: params.bookingLinkSlug,
    provider_id: params.providerId,
    appointment_date: params.appointmentDate,
  });
}

/**
 * Track booking success page view
 */
export function trackBookingCompleted(params: {
  bookingLinkSlug: string;
  organizationId?: string;
  organizationName?: string;
}): void {
  trackEvent(AnalyticsEvents.BOOKING_COMPLETED, {
    booking_link_slug: params.bookingLinkSlug,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
  });
}

/**
 * Track confirmation page view
 */
export function trackConfirmationPageView(params: {
  appointmentId: string;
  businessName?: string;
  serviceName?: string;
}): void {
  trackEvent(AnalyticsEvents.CONFIRMATION_PAGE_VIEW, {
    appointment_id: params.appointmentId,
    business_name: params.businessName,
    service_name: params.serviceName,
  });
}

/**
 * Track appointment confirmation
 */
export function trackAppointmentConfirmed(params: {
  appointmentId: string;
  businessName?: string;
  serviceName?: string;
}): void {
  trackEvent(AnalyticsEvents.APPOINTMENT_CONFIRMED, {
    appointment_id: params.appointmentId,
    business_name: params.businessName,
    service_name: params.serviceName,
  });
}

/**
 * Track dashboard view
 */
export function trackDashboardView(params: {
  userClerkId?: string;
  organizationId?: string;
  organizationName?: string;
}): void {
  trackEvent(AnalyticsEvents.DASHBOARD_VIEW, {
    user_clerk_id: params.userClerkId,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
  });
}

/**
 * Track onboarding started
 */
export function trackOnboardingStarted(params: {
  userClerkId?: string;
  organizationId?: string;
  organizationName?: string;
}): void {
  trackEvent(AnalyticsEvents.ONBOARDING_STARTED, {
    user_clerk_id: params.userClerkId,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
  });
}

/**
 * Track onboarding step completion
 */
export function trackOnboardingStepCompleted(params: {
  stepName: string;
  stepNumber: number;
  userClerkId?: string;
  organizationId?: string;
  organizationName?: string;
}): void {
  trackEvent(AnalyticsEvents.ONBOARDING_STEP_COMPLETED, {
    step_name: params.stepName,
    step_number: params.stepNumber,
    user_clerk_id: params.userClerkId,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
  });
}

/**
 * Track onboarding completed
 */
export function trackOnboardingCompleted(params: {
  userClerkId?: string;
  organizationId?: string;
  organizationName?: string;
}): void {
  trackEvent(AnalyticsEvents.ONBOARDING_COMPLETED, {
    user_clerk_id: params.userClerkId,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
  });
}

/**
 * Track booking link copied
 */
export function trackBookingLinkCopied(params: {
  bookingLinkSlug: string;
  userClerkId?: string;
  organizationId?: string;
  organizationName?: string;
}): void {
  trackEvent(AnalyticsEvents.BOOKING_LINK_COPIED, {
    booking_link_slug: params.bookingLinkSlug,
    user_clerk_id: params.userClerkId,
    organization_id: params.organizationId,
    organization_name: params.organizationName,
  });
}
