import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity for storing SMS (Verimor) configuration per organization.
 * 
 * This entity stores the Verimor SMS API credentials for each organization.
 * Organizations can use their own Verimor account or fall back to global credentials.
 * 
 * @see https://github.com/verimor/SMS-API
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

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Verimor API username' })
  username: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'Verimor API password' })
  password: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'SMS sender ID / source address (alphanumeric header)' })
  sourceAddr: string | null;

  @Column({ type: 'varchar', length: 10, default: 'tr', comment: 'Language code for SMS templates (e.g., tr, en)' })
  templateLanguage: string;

  @Column({ type: 'boolean', default: false, comment: 'Use global Verimor credentials instead of organization-specific' })
  useGlobalCredentials: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
