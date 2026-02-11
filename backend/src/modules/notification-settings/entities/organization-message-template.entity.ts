import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Message template types
 */
export enum MessageTemplateType {
  APPOINTMENT_BOOKED = 'APPOINTMENT_BOOKED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
}

/**
 * Entity for storing customizable message templates.
 * 
 * These templates are used across all notification channels (Email, SMS, WhatsApp).
 * 
 * Available placeholders:
 * - {{clientName}} - Client's name
 * - {{serviceName}} - Name of the service
 * - {{appointmentDate}} - Formatted date of the appointment
 * - {{appointmentTime}} - Formatted time of the appointment
 * - {{providerName}} - Name of the service provider
 * - {{organizationName}} - Name of the organization
 * - {{appointmentLink}} - Link to view/edit/cancel appointment
 * - {{confirmationLink}} - Link to confirm attendance
 */
@Entity('organization_message_templates')
export class OrganizationMessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: 'Clerk Organization ID' })
  @Index('idx_message_template_org_id')
  organizationId: string;

  @Column({
    type: 'enum',
    enum: MessageTemplateType,
    comment: 'Type of message template',
  })
  templateType: MessageTemplateType;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: 'Email subject line' })
  emailSubject: string | null;

  @Column({ type: 'text', comment: 'Message content (used for SMS/WhatsApp and email body)' })
  messageContent: string;

  @Column({ default: true, comment: 'Whether this template is active' })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Default message templates
 */
export const DEFAULT_MESSAGE_TEMPLATES: Record<MessageTemplateType, { emailSubject: string; messageContent: string }> = {
  [MessageTemplateType.APPOINTMENT_BOOKED]: {
    emailSubject: '{{organizationName}} - Appointment Confirmed',
    messageContent: `Hi {{clientName}},

Your appointment has been booked!

📅 Date: {{appointmentDate}}
⏰ Time: {{appointmentTime}}
📋 Service: {{serviceName}}
{{providerName}}

To view, edit, or cancel your appointment, click here:
{{appointmentLink}}

We look forward to seeing you!

Best regards,
{{organizationName}}`,
  },
  [MessageTemplateType.APPOINTMENT_REMINDER]: {
    emailSubject: '{{organizationName}} - Appointment Reminder',
    messageContent: `Hi {{clientName}},

This is a reminder about your upcoming appointment:

📅 Date: {{appointmentDate}}
⏰ Time: {{appointmentTime}}
📋 Service: {{serviceName}}
{{providerName}}

Please confirm your attendance:
{{confirmationLink}}

To view, edit, or cancel your appointment:
{{appointmentLink}}

We look forward to seeing you!

Best regards,
{{organizationName}}`,
  },
  [MessageTemplateType.APPOINTMENT_UPDATED]: {
    emailSubject: '{{organizationName}} - Appointment Updated',
    messageContent: `Hi {{clientName}},

Your appointment has been updated by {{organizationName}}.

📅 New Date: {{appointmentDate}}
⏰ New Time: {{appointmentTime}}
📋 Service: {{serviceName}}
{{providerName}}

To view your updated appointment details:
{{appointmentLink}}

If you have any questions, please contact us.

Best regards,
{{organizationName}}`,
  },
  [MessageTemplateType.APPOINTMENT_CANCELED]: {
    emailSubject: '{{organizationName}} - Appointment Canceled',
    messageContent: `Hi {{clientName}},

Your appointment has been canceled.

📅 Original Date: {{appointmentDate}}
⏰ Original Time: {{appointmentTime}}
📋 Service: {{serviceName}}

If you would like to reschedule, please book a new appointment.

Best regards,
{{organizationName}}`,
  },
};
