import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * SMS Event Types - matches the notification event types
 */
export enum SmsEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
}

/**
 * Entity for storing SMS message templates.
 * 
 * Templates can be:
 * - Default templates (organizationId = null, isDefault = true) - provided by the system
 * - Organization-specific templates (organizationId = org_id) - customized by organization
 * 
 * Available variables for templates:
 * - {{clientName}} - Client's name
 * - {{serviceName}} - Service/appointment type
 * - {{appointmentDate}} - Date (e.g., 15 Şubat 2026)
 * - {{appointmentTime}} - Time (e.g., 14:30)
 * - {{providerName}} - Provider/staff name
 * - {{organizationName}} - Business name
 * - {{confirmationLink}} - Link to confirm appointment
 * - {{appointmentLink}} - Link to view/manage appointment
 * - {{cancellationReason}} - Reason for cancellation (only for canceled events)
 */
@Entity('sms_templates')
export class SmsTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Clerk Organization ID. Null for default templates.' })
  @Index('idx_sms_template_org_id')
  organizationId: string | null;

  @Column({ type: 'enum', enum: SmsEventType, comment: 'Event type this template is for' })
  @Index('idx_sms_template_event_type')
  eventType: SmsEventType;

  @Column({ type: 'varchar', length: 10, default: 'tr', comment: 'Language code (e.g., tr, en)' })
  @Index('idx_sms_template_language')
  language: string;

  @Column({ type: 'varchar', length: 100, comment: 'Template name for identification' })
  name: string;

  @Column({ type: 'text', comment: 'SMS message content with variables' })
  content: string;

  @Column({ default: true, comment: 'Whether this template is active' })
  isActive: boolean;

  @Column({ default: false, comment: 'Whether this is a system default template' })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
