import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity for storing which appointment events should trigger WhatsApp notifications.
 * 
 * Each organization can configure which events will send WhatsApp messages.
 */
@Entity('organization_notification_parameters')
export class OrganizationNotificationParameters {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: 'Clerk Organization ID' })
  @Index('idx_notification_params_org_id')
  organizationId: string;

  @Column({ default: true, comment: 'Send notification when appointment is created' })
  appointmentCreated: boolean;

  @Column({ default: true, comment: 'Send reminder before appointment' })
  appointmentReminder: boolean;

  @Column({ default: true, comment: 'Send notification when appointment is canceled' })
  appointmentCanceled: boolean;

  @Column({ default: true, comment: 'Send notification when appointment is rescheduled' })
  appointmentRescheduled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
