import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Enum for email provider types
 */
export enum EmailProvider {
  SMTP = 'SMTP',
  SENDGRID = 'SENDGRID',
  RESEND = 'RESEND',
}

/**
 * Entity for storing Email configuration per organization.
 * 
 * This entity stores the email provider credentials for each organization.
 * The password/API key is encrypted at rest for security.
 * 
 * Supports multiple providers:
 * - SMTP (generic SMTP server)
 * - SendGrid (via API key)
 * - Resend (via API key)
 */
@Entity('organization_email_settings')
export class OrganizationEmailSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: 'Clerk Organization ID' })
  @Index('idx_email_settings_org_id')
  organizationId: string;

  @Column({ default: false, comment: 'Whether Email notifications are enabled' })
  enabled: boolean;

  @Column({
    type: 'enum',
    enum: EmailProvider,
    default: EmailProvider.SMTP,
    comment: 'Email provider type',
  })
  provider: EmailProvider;

  // SMTP Settings
  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'SMTP host' })
  smtpHost: string | null;

  @Column({ type: 'int', nullable: true, comment: 'SMTP port' })
  smtpPort: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'SMTP username' })
  smtpUsername: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Encrypted SMTP password or API key' })
  smtpPassword: string | null;

  @Column({ default: true, comment: 'Use TLS for SMTP connection' })
  smtpSecure: boolean;

  // Common Settings
  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'From email address' })
  fromEmail: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'From name' })
  fromName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Reply-to email address' })
  replyToEmail: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
