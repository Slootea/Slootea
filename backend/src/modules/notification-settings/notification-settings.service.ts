import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  OrganizationWhatsAppSettings,
} from './entities/organization-whatsapp-settings.entity';
import {
  OrganizationNotificationParameters,
} from './entities/organization-notification-parameters.entity';
import {
  UpdateWhatsAppSettingsDto,
  ConnectWhatsAppDto,
  WhatsAppNotificationSettingsResponseDto,
} from './dto/whatsapp-notification-settings.dto';

@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  constructor(
    @InjectRepository(OrganizationWhatsAppSettings)
    private readonly whatsappSettingsRepository: Repository<OrganizationWhatsAppSettings>,
    @InjectRepository(OrganizationNotificationParameters)
    private readonly notificationParamsRepository: Repository<OrganizationNotificationParameters>,
    private readonly configService: ConfigService,
  ) {
    // Get encryption key from environment or generate a default for development
    const keyString = this.configService.get<string>('WHATSAPP_TOKEN_ENCRYPTION_KEY');
    if (keyString) {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else {
      // Default key for development - MUST be replaced in production
      this.logger.warn('WHATSAPP_TOKEN_ENCRYPTION_KEY not set, using default key (NOT SAFE FOR PRODUCTION)');
      this.encryptionKey = crypto.scryptSync('default-dev-key', 'salt', 32);
    }
  }

  /**
   * Encrypt a string using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.encryptionAlgorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a string encrypted with AES-256-GCM
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.encryptionAlgorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Get or create WhatsApp settings for an organization
   */
  private async getOrCreateWhatsAppSettings(organizationId: string): Promise<OrganizationWhatsAppSettings> {
    let settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.whatsappSettingsRepository.create({
        organizationId,
        enabled: false,
      });
      settings = await this.whatsappSettingsRepository.save(settings);
    }

    return settings;
  }

  /**
   * Get or create notification parameters for an organization
   */
  private async getOrCreateNotificationParams(organizationId: string): Promise<OrganizationNotificationParameters> {
    let params = await this.notificationParamsRepository.findOne({
      where: { organizationId },
    });

    if (!params) {
      params = this.notificationParamsRepository.create({
        organizationId,
        appointmentCreated: true,
        appointmentReminder: true,
        appointmentCanceled: true,
        appointmentRescheduled: true,
      });
      params = await this.notificationParamsRepository.save(params);
    }

    return params;
  }

  /**
   * Get complete WhatsApp notification settings for an organization
   */
  async getWhatsAppSettings(organizationId: string): Promise<WhatsAppNotificationSettingsResponseDto> {
    const [whatsappSettings, notificationParams] = await Promise.all([
      this.getOrCreateWhatsAppSettings(organizationId),
      this.getOrCreateNotificationParams(organizationId),
    ]);

    // Check if connected (has wabaId and phoneNumberId)
    const isConnected = !!(whatsappSettings.wabaId && whatsappSettings.phoneNumberId && whatsappSettings.accessToken);

    return {
      enabled: whatsappSettings.enabled,
      isConnected,
      displayPhoneNumber: whatsappSettings.displayPhoneNumber || undefined,
      templateLanguage: whatsappSettings.templateLanguage || 'tr',
      parameters: {
        appointmentCreated: notificationParams.appointmentCreated,
        appointmentReminder: notificationParams.appointmentReminder,
        appointmentCanceled: notificationParams.appointmentCanceled,
        appointmentRescheduled: notificationParams.appointmentRescheduled,
      },
      templates: [], // Templates are now managed directly in Meta Business Suite
    };
  }

  /**
   * Update WhatsApp enabled status and notification parameters
   */
  async updateWhatsAppSettings(
    organizationId: string,
    dto: UpdateWhatsAppSettingsDto,
  ): Promise<WhatsAppNotificationSettingsResponseDto> {
    // Update WhatsApp settings (enabled flag and template language)
    let whatsappSettings = await this.getOrCreateWhatsAppSettings(organizationId);
    whatsappSettings.enabled = dto.enabled;
    if (dto.templateLanguage) {
      whatsappSettings.templateLanguage = dto.templateLanguage;
    }
    await this.whatsappSettingsRepository.save(whatsappSettings);

    // Update notification parameters
    let notificationParams = await this.getOrCreateNotificationParams(organizationId);
    if (dto.parameters) {
      if (dto.parameters.appointmentCreated !== undefined) {
        notificationParams.appointmentCreated = dto.parameters.appointmentCreated;
      }
      if (dto.parameters.appointmentReminder !== undefined) {
        notificationParams.appointmentReminder = dto.parameters.appointmentReminder;
      }
      if (dto.parameters.appointmentCanceled !== undefined) {
        notificationParams.appointmentCanceled = dto.parameters.appointmentCanceled;
      }
      if (dto.parameters.appointmentRescheduled !== undefined) {
        notificationParams.appointmentRescheduled = dto.parameters.appointmentRescheduled;
      }
      await this.notificationParamsRepository.save(notificationParams);
    }

    return this.getWhatsAppSettings(organizationId);
  }

  /**
   * Connect WhatsApp Business Account
   * Stores encrypted access token
   */
  async connectWhatsApp(
    organizationId: string,
    dto: ConnectWhatsAppDto,
  ): Promise<WhatsAppNotificationSettingsResponseDto> {
    let settings = await this.getOrCreateWhatsAppSettings(organizationId);

    settings.wabaId = dto.wabaId;
    settings.phoneNumberId = dto.phoneNumberId;
    settings.accessToken = this.encrypt(dto.accessToken);
    settings.tokenExpiresAt = dto.tokenExpiresAt ? new Date(dto.tokenExpiresAt) : null;
    settings.displayPhoneNumber = dto.displayPhoneNumber || null;

    await this.whatsappSettingsRepository.save(settings);

    this.logger.log(`WhatsApp Business connected for organization ${organizationId}`);

    return this.getWhatsAppSettings(organizationId);
  }

  /**
   * Disconnect WhatsApp Business Account
   */
  async disconnectWhatsApp(organizationId: string): Promise<WhatsAppNotificationSettingsResponseDto> {
    let settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    if (settings) {
      settings.wabaId = null;
      settings.phoneNumberId = null;
      settings.accessToken = null;
      settings.tokenExpiresAt = null;
      settings.displayPhoneNumber = null;
      settings.enabled = false;
      await this.whatsappSettingsRepository.save(settings);
    }

    this.logger.log(`WhatsApp Business disconnected for organization ${organizationId}`);

    return this.getWhatsAppSettings(organizationId);
  }

  /**
   * Get decrypted access token for sending messages (internal use only)
   * NOTE: This should only be called by the WhatsApp sending service
   */
  async getDecryptedAccessToken(organizationId: string): Promise<string | null> {
    const settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings?.accessToken) {
      return null;
    }

    try {
      return this.decrypt(settings.accessToken);
    } catch (error) {
      this.logger.error(`Failed to decrypt access token for organization ${organizationId}`, error);
      return null;
    }
  }

  /**
   * Check if WhatsApp is enabled and connected for an organization
   * Used by appointment service to determine if WhatsApp notifications should be sent
   */
  async isWhatsAppReady(organizationId: string): Promise<boolean> {
    const settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    return !!(settings?.enabled && settings?.wabaId && settings?.phoneNumberId && settings?.accessToken);
  }
}
