import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity for storing SMS (Twilio) configuration per organization.
 * 
 * This entity stores the Twilio API credentials for each organization.
 * The auth_token is encrypted at rest for security.
 * 
 * @see https://www.twilio.com/docs/sms
 */
@Entity('organization_sms_settings')
export class OrganizationSmsSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: 'Clerk Organization ID' })
  @Index('idx_sms_settings_org_id')
  organizationId: string;

  @Column({ default: false, comment: 'Whether SMS notifications are enabled' })
  enabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Twilio Account SID' })
  accountSid: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Encrypted Twilio Auth Token' })
  authToken: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Twilio phone number to send from' })
  fromPhoneNumber: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
