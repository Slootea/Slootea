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
  providerId?: string;
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
}

export interface PublicBookingLink extends BookingLink {
  user: User;
  serviceOptions: ServiceOption[];
  settings?: PublicBookingSettings;
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

// Gamification Types
export type ClientLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface SpinWheelPrize {
  id: string;
  name: string;
  type: 'points' | 'discount' | 'freebie' | 'nothing';
  value: number;
  description?: string;
  probability: number;
  color: string;
}

export interface GamificationSettings {
  id: string;
  enabled: boolean;
  pointsPerBooking: number;
  pointsPerCompletedAppointment: number;
  pointsPerReferral: number;
  pointsForReferred: number;
  streakBonusPoints: number;
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
  bronzeDiscount: number;
  silverDiscount: number;
  goldDiscount: number;
  platinumDiscount: number;
  spinWheelEnabled: boolean;
  spinWheelPrizes: SpinWheelPrize[];
  referralsEnabled: boolean;
  maxReferralsPerClient: number;
  virtualPetEnabled: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientGamificationSummary {
  totalPoints: number;
  availablePoints: number;
  level: ClientLevel;
  levelProgress: number;
  nextLevel: ClientLevel | null;
  pointsToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  referralCode: string;
  totalReferrals: number;
  successfulReferrals: number;
  canSpin: boolean;
  discountPercentage: number;
}

export interface PointsHistory {
  id: string;
  clientId: string;
  transactionType: string;
  points: number;
  balanceAfter: number;
  description?: string;
  relatedEntityId?: string;
  createdAt: string;
}

export interface ClientReward {
  id: string;
  clientId: string;
  rewardType: string;
  rewardName: string;
  description?: string;
  valueType: 'points' | 'discount' | 'freebie';
  value: number;
  isRedeemed: boolean;
  redeemedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface GamificationStatus {
  enabled: boolean;
  referralsEnabled: boolean;
  spinWheelEnabled: boolean;
  virtualPetEnabled?: boolean;
  pointsPerBooking: number;
  levels: {
    bronze: { threshold: number; discount: number };
    silver: { threshold: number; discount: number };
    gold: { threshold: number; discount: number };
    platinum: { threshold: number; discount: number };
  };
}

export interface ClientLookupResult {
  found: boolean;
  client?: {
    id: string;
    name: string;
    email?: string;
    phone: string;
  };
  gamification?: ClientGamificationSummary;
}

export interface ReferralValidation {
  valid: boolean;
  message?: string;
  referrerName?: string;
  bonusPoints?: number;
}

export interface SpinWheelResult {
  prize: SpinWheelPrize;
  pointsEarned: number;
  newBalance: number;
}

export interface GamificationStats {
  enabled: boolean;
  totalPointsIssued: number;
  totalReferrals: number;
  levelDistribution: { level: string; count: string }[];
  topReferrers: { id: string; name: string; referrals: number; level: string }[];
}

// Extended Client with gamification fields
export interface ClientWithGamification extends Client {
  totalPoints: number;
  availablePoints: number;
  level: ClientLevel;
  currentStreak: number;
  longestStreak: number;
  totalReferrals: number;
  successfulReferrals: number;
  referralCode?: string;
  referredBy?: string;
  spinWheelSpins: number;
  lastSpinAt?: string;
}

// Virtual Pet Types
export type PetType = 'cat' | 'dog' | 'bunny' | 'hamster' | 'bird';
export type PetStage = 'egg' | 'baby' | 'teen' | 'adult' | 'elder';
export type PetMood = 'ecstatic' | 'happy' | 'content' | 'sad' | 'hungry' | 'sleepy';
export type ItemType = 'food' | 'toy' | 'accessory' | 'decoration';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface PlacedItem {
  itemId: string;
  x: number;
  y: number;
  rotation?: number;
}

export interface VirtualPet {
  id: string;
  name: string;
  type: PetType;
  stage: PetStage;
  experience: number;
  experienceToNextLevel: number;
  hunger: number;
  happiness: number;
  energy: number;
  level: number;
  mood: PetMood;
  accessories: string[];
  playgroundItems: PlacedItem[];
  lastFedAt: string | null;
  lastPlayedAt: string | null;
  totalTimesPlayed: number;
  totalTimesFed: number;
  createdAt: string;
}

export interface PetInteractionResult {
  pet: VirtualPet;
  message: string;
  rewards?: {
    experience?: number;
    happiness?: number;
    hunger?: number;
    energy?: number;
  };
  leveledUp?: boolean;
  stageEvolved?: boolean;
  newStage?: string;
  newLevel?: number;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  price: number;
  effect?: {
    hunger?: number;
    happiness?: number;
    energy?: number;
    experience?: number;
  };
  emoji: string;
  unlockLevel?: number;
  canPurchase: boolean;
  reason?: string;
}

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: ItemType;
  quantity: number;
  emoji: string;
  effect?: {
    hunger?: number;
    happiness?: number;
    energy?: number;
    experience?: number;
  };
}

export interface PetShopResponse {
  items: ShopItem[];
  clientPoints: number;
  petLevel: number;
}

export interface PetInventoryResponse {
  items: InventoryItem[];
  clientPoints: number;
}

export interface BuyItemResult {
  success: boolean;
  message: string;
  item?: InventoryItem;
  pointsSpent: number;
  remainingPoints: number;
}

export interface VirtualPetStatus {
  enabled: boolean;
  gamificationEnabled: boolean;
}
