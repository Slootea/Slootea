import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('organization_settings')
export class OrganizationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: 'Clerk Organization ID' })
  organizationId: string;

  // Booking Settings
  @Column({
    type: 'int',
    default: 24,
    comment: 'Hours before appointment when confirmation is required',
  })
  confirmationRequiredHours: number;

  @Column({
    type: 'int',
    default: 3,
    comment: 'Hours before appointment - confirmation deadline',
  })
  confirmationDeadlineHours: number;

  @Column({
    default: true,
    comment: 'Auto-cancel if not confirmed before deadline',
  })
  autoCancelUnconfirmed: boolean;

  @Column({
    type: 'int',
    default: 15,
    comment: 'Buffer time between appointments in minutes',
  })
  bufferTimeMinutes: number;

  @Column({
    type: 'int',
    default: 10,
    comment: 'Maximum appointments per day per member',
  })
  maxAppointmentsPerDay: number;

  @Column({
    type: 'int',
    default: 24,
    comment: 'Minimum hours in advance for booking',
  })
  minAdvanceBookingHours: number;

  @Column({
    type: 'int',
    default: 30,
    comment: 'Maximum days in advance for booking',
  })
  maxAdvanceBookingDays: number;

  // Provider Selection Settings
  @Column({
    default: false,
    comment: 'Allow clients to select specific provider when booking',
  })
  allowProviderSelection: boolean;

  @Column({
    default: false,
    comment: 'Auto-assign provider based on availability',
  })
  autoAssignProvider: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'auto_assign',
    comment: 'Provider selection mode: client_chooses (clients select provider after service) or auto_assign (system assigns based on availability)',
  })
  providerSelectionMode: 'client_chooses' | 'auto_assign';

  @Column({
    default: true,
    comment: 'Show provider names to clients during booking',
  })
  showProviderNames: boolean;

  @Column({
    default: true,
    comment: 'Show provider photos to clients during booking',
  })
  showProviderPhotos: boolean;

  // Organization Display Settings
  @Column({ type: 'text', nullable: true })
  welcomeMessage: string;

  @Column({ type: 'text', nullable: true })
  bookingInstructions: string;

  @Column({ type: 'text', nullable: true })
  confirmationMessage: string;

  @Column({ type: 'text', nullable: true })
  cancellationPolicy: string;

  // Notification Settings
  @Column({ default: true })
  sendEmailReminders: boolean;

  @Column({ default: true })
  sendSmsReminders: boolean;

  @Column({
    type: 'int',
    default: 24,
    comment: 'Hours before appointment to send reminder',
  })
  reminderHoursBefore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
