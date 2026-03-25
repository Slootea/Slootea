# Google Analytics 4 Custom Dimensions Setup

This document outlines the custom dimensions you need to create in Google Analytics 4 to capture event parameters from Slootea.

## How to Create Custom Dimensions

1. Go to **Google Analytics 4** → **Admin** (gear icon)
2. Under **Data display**, click **Custom definitions**
3. Click **Create custom dimensions**
4. For each dimension below, fill in:
   - **Dimension name**: Use the name provided
   - **Scope**: Select as specified (Event or User)
   - **Event parameter**: Use the exact parameter name

---

## Required Custom Dimensions

### User & Authentication Dimensions

| Dimension Name | Scope | Event Parameter | Description |
|----------------|-------|-----------------|-------------|
| User Clerk ID | Event | `user_clerk_id` | Clerk authentication user ID |

### Organization Dimensions

| Dimension Name | Scope | Event Parameter | Description |
|----------------|-------|-----------------|-------------|
| Organization ID | Event | `organization_id` | Clerk organization ID |
| Organization Name | Event | `organization_name` | Organization/business display name |
| Business Name | Event | `business_name` | Business name (for public pages) |

### Booking Flow Dimensions

| Dimension Name | Scope | Event Parameter | Description |
|----------------|-------|-----------------|-------------|
| Booking Link Slug | Event | `booking_link_slug` | URL slug of the booking link |
| Service ID | Event | `service_id` | UUID of the selected service |
| Service Name | Event | `service_name` | Display name of the service |
| Provider ID | Event | `provider_id` | UUID of the selected provider |
| Provider Name | Event | `provider_name` | Display name of the provider |

### Appointment Dimensions

| Dimension Name | Scope | Event Parameter | Description |
|----------------|-------|-----------------|-------------|
| Appointment ID | Event | `appointment_id` | UUID of the appointment |
| Appointment Date | Event | `appointment_date` | Date of appointment (YYYY-MM-DD) |
| Slot Date | Event | `slot_date` | Selected slot date (YYYY-MM-DD) |
| Slot Time | Event | `slot_time` | Selected slot time (HH:mm) |

### Onboarding Dimensions

| Dimension Name | Scope | Event Parameter | Description |
|----------------|-------|-----------------|-------------|
| Step Name | Event | `step_name` | Onboarding step name (settings, services, availability, notifications) |
| Step Number | Event | `step_number` | Onboarding step number (1-4) |

### AI Assistant Dimensions

| Dimension Name | Scope | Event Parameter | Description |
|----------------|-------|-----------------|-------------|
| Has Query | Event | `has_query` | Boolean - whether user sent a query |

---

## Events Reference

### Authentication Events

| Event Name | Parameters |
|------------|------------|
| `sign_in` | `user_clerk_id`, `organization_id`, `organization_name` |
| `sign_up` | `user_clerk_id`, `organization_id`, `organization_name` |

### Public Booking Flow Events

| Event Name | Parameters |
|------------|------------|
| `booking_link_view` | `booking_link_slug`, `organization_id`, `organization_name`, `business_name` |
| `service_selected` | `service_id`, `service_name`, `organization_id`, `organization_name`, `booking_link_slug` |
| `ai_assistant_used` | `organization_id`, `organization_name`, `has_query` |
| `slot_selected` | `slot_date`, `slot_time`, `service_id`, `organization_id`, `organization_name` |
| `provider_selected` | `provider_id`, `provider_name`, `organization_id`, `organization_name` |
| `appointment_booked` | `service_id`, `service_name`, `organization_id`, `organization_name`, `booking_link_slug`, `provider_id`, `appointment_date` |
| `booking_completed` | `booking_link_slug`, `organization_id`, `organization_name` |

### Appointment Confirmation Events

| Event Name | Parameters |
|------------|------------|
| `confirmation_page_view` | `appointment_id`, `business_name`, `service_name` |
| `appointment_confirmed` | `appointment_id`, `business_name`, `service_name` |

### Dashboard Events

| Event Name | Parameters |
|------------|------------|
| `dashboard_view` | `user_clerk_id`, `organization_id`, `organization_name` |
| `booking_link_copied` | `booking_link_slug`, `user_clerk_id`, `organization_id`, `organization_name` |

### Onboarding Events

| Event Name | Parameters |
|------------|------------|
| `onboarding_started` | `user_clerk_id`, `organization_id`, `organization_name` |
| `onboarding_step_completed` | `step_name`, `step_number`, `user_clerk_id`, `organization_id`, `organization_name` |
| `onboarding_completed` | `user_clerk_id`, `organization_id`, `organization_name` |

---

## Recommended Reports & Explorations

### 1. Booking Funnel
Track conversion through the booking flow:
```
booking_link_view → service_selected → slot_selected → appointment_booked → booking_completed
```

### 2. Organization Performance
Group by `organization_id` or `organization_name` to see:
- Total bookings per organization
- Confirmation rates
- Popular services

### 3. Service Analytics
Group by `service_id` or `service_name` to see:
- Most popular services
- Services with highest conversion rates

### 4. Provider Analytics
Group by `provider_id` to see:
- Bookings per provider
- Provider selection patterns

### 5. Onboarding Completion
Track onboarding funnel:
```
onboarding_started → step 1 → step 2 → step 3 → step 4 → onboarding_completed
```

### 6. AI Assistant Effectiveness
Measure AI assistant impact on conversions:
- Compare conversion rates with/without AI assistant usage
- Track `ai_assistant_used` → `appointment_booked` correlation

---

## GA4 Limits

Be aware of GA4 limits:
- **50 event-scoped custom dimensions** per property
- **25 user-scoped custom dimensions** per property
- Custom dimension names must be **≤ 24 characters**

This implementation uses **15 event-scoped dimensions**, well within limits.

---

## Testing

To verify events are being sent:

1. **GA4 DebugView**: 
   - Go to Admin → DebugView
   - Enable debug mode in browser (install GA Debugger extension)
   - Events should appear in real-time

2. **Browser Console** (Development):
   - Events are logged to console with `[Analytics]` prefix
   - Example: `[Analytics] Event: appointment_booked {...}`

3. **Realtime Reports**:
   - Go to Reports → Realtime
   - Events should appear within seconds
