import { AvailableSlot, Provider, ServiceOption, PublicBookingLink } from "@/lib/types";
import { Locale } from "date-fns";

// Step types for the booking flow
export type BookingStep = 'provider' | 'datetime' | 'info';

export interface StepConfig {
  key: BookingStep;
  label: string;
  completed: boolean;
}

export interface BookingContext {
  slug: string;
  bookingLink: PublicBookingLink | null;
  selectedService: ServiceOption;
  selectedProvider: Provider | null;
  selectedSlot: AvailableSlot | null;
  selectedDate: Date | undefined;
  dateLocale: Locale;
  organizationId?: string;
  organizationName?: string;
}

export interface ProviderSelectionStepProps {
  providers: Provider[];
  selectedProvider: Provider | null;
  providersLoading: boolean;
  onSelectProvider: (provider: Provider) => void;
  onContinue: () => void;
  bookingLink: PublicBookingLink | null;
}

export interface DateTimeSelectionStepProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  slots: AvailableSlot[];
  selectedSlot: AvailableSlot | null;
  setSelectedSlot: (slot: AvailableSlot | null) => void;
  slotsLoading: boolean;
  availableDates: Set<string>;
  availableDatesLoading: boolean;
  providerSelectionEnabled: boolean;
  selectedProvider: Provider | null;
  selectedService: ServiceOption;
  bookingLink: PublicBookingLink | null;
  today: Date;
  maxDate: Date;
  dateLocale: Locale;
  showBackButton: boolean;
  onBack: () => void;
  onContinue: () => void;
}

export interface ClientInfoStepProps {
  clientName: string;
  setClientName: (name: string) => void;
  clientPhone: string;
  setClientPhone: (phone: string) => void;
  clientEmail: string;
  setClientEmail: (email: string) => void;
  selectedService: ServiceOption;
  selectedProvider: Provider | null;
  selectedSlot: AvailableSlot | null;
  dateLocale: Locale;
  booking: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export interface ServiceHeaderProps {
  service: ServiceOption;
}

export interface StepIndicatorProps {
  steps: StepConfig[];
  currentStep: BookingStep;
  onStepClick?: (step: BookingStep) => void;
}

export interface AnimatedStepProps {
  children: React.ReactNode;
  isActive: boolean;
  direction?: 'forward' | 'backward';
}
