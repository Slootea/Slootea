import { Availability, BlockedTime, ExternalProvider, OrganizationMember, ServiceOption } from "@/lib/types";

// Day names for availability
export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Provider display data structure
export interface ProviderDisplayData {
  id: string;
  name: string;
  imageUrl?: string;
  isActive?: boolean;
}

// Form data for external provider
export interface ExternalProviderFormData {
  name: string;
  imageBase64: string;
  isActive: boolean;
}

// Blocked time form data
export interface BlockedTimeFormData {
  date: string;
  startTime: string;
  endTime: string;
  isFullDay: boolean;
  reason: string;
}

// Availability form data
export interface AvailabilityFormData {
  startTime: string;
  endTime: string;
}

// Provider edit dialog context
export interface ProviderEditContext {
  editingType: 'member' | 'external';
  editingMember: OrganizationMember | null;
  editingProvider: ExternalProvider | null;
  formData: ExternalProviderFormData;
  assignedServiceIds: string[];
  providerAvailability: Availability[];
  blockedTimes: BlockedTime[];
  serviceOptions: ServiceOption[];
  availabilityLoading: boolean;
  blockedTimesLoading: boolean;
  saving: boolean;
  serviceSearch: string;
}

// Provider edit dialog handlers
export interface ProviderEditHandlers {
  onFormDataChange: (data: Partial<ExternalProviderFormData>) => void;
  onServiceToggle: (serviceId: string, checked: boolean) => void;
  onBulkAssignServices: () => Promise<void>;
  onBulkClearServices: () => Promise<void>;
  onServiceSearchChange: (search: string) => void;
  onAddAvailability: (day: number) => void;
  onDeleteAvailability: (id: string) => void;
  onAddBlockedTime: () => void;
  onDeleteBlockedTime: (id: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => Promise<void>;
  onClose: () => void;
}
