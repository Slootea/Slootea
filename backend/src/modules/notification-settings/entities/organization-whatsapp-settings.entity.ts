import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Entity for storing WhatsApp Business API configuration per organization.
 * 
 * This entity stores the Meta WhatsApp Cloud API credentials for each organization.
 * The access_token is encrypted at rest for security.
 * 
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api
 */
@Entity('organization_whatsapp_settings')
export class OrganizationWhatsAppSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, comment: 'Clerk Organization ID' })
  @Index('idx_whatsapp_settings_org_id')
  organizationId: string;

  @Column({ default: false, comment: 'Whether WhatsApp notifications are enabled' })
  enabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'WhatsApp Business Account ID' })
  wabaId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'WhatsApp Phone Number ID' })
  phoneNumberId: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Encrypted WhatsApp access token' })
  accessToken: string | null;

  @Column({ type: 'timestamp', nullable: true, comment: 'Token expiration date' })
  tokenExpiresAt: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Connected phone number (display only)' })
  displayPhoneNumber: string | null;

  @Column({ type: 'varchar', length: 10, default: 'tr', comment: 'Language code for WhatsApp templates (e.g., tr, en, en_US)' })
  templateLanguage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
