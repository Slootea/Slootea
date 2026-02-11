import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Enum for WhatsApp notification event types
 */
export enum WhatsAppEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  REMINDER_24H = 'REMINDER_24H',
  REMINDER_1H = 'REMINDER_1H',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
}

/**
 * Enum for WhatsApp template approval status
 */
export enum WhatsAppTemplateStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Entity for mapping WhatsApp message templates to appointment events.
 * 
 * Each organization can configure which WhatsApp template is used for each event type.
 * Templates must be pre-approved by Meta before they can be used.
 * 
 * @see https://developers.facebook.com/docs/whatsapp/message-templates
 */
@Entity('organization_whatsapp_templates')
export class OrganizationWhatsAppTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Clerk Organization ID' })
  @Index('idx_whatsapp_templates_org_id')
  organizationId: string;

  @Column({
    type: 'enum',
    enum: WhatsAppEventType,
    comment: 'The appointment event type this template is for',
  })
  eventType: WhatsAppEventType;

  @Column({ type: 'varchar', length: 512, comment: 'WhatsApp template name as configured in Meta Business' })
  templateName: string;

  @Column({ type: 'varchar', length: 10, default: 'en', comment: 'Template language code (e.g., en, es, fr)' })
  languageCode: string;

  @Column({
    type: 'enum',
    enum: WhatsAppTemplateStatus,
    default: WhatsAppTemplateStatus.PENDING,
    comment: 'Template approval status from Meta',
  })
  status: WhatsAppTemplateStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
