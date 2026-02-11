import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  OrganizationWhatsAppTemplate,
  WhatsAppEventType,
  WhatsAppTemplateStatus,
} from './entities/organization-whatsapp-template.entity';
import {
  OrganizationSmsSettings,
} from './entities/organization-sms-settings.entity';
import {
  UpdateWhatsAppSettingsDto,
  ConnectWhatsAppDto,
  AssignWhatsAppTemplateDto,
  WhatsAppNotificationSettingsResponseDto,
  WhatsAppTemplateResponseDto,
} from './dto/whatsapp-notification-settings.dto';
import {
  UpdateSmsSettingsDto,
  ConnectSmsDto,
  SmsNotificationSettingsResponseDto,
} from './dto/sms-notification-settings.dto';

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
    @InjectRepository(OrganizationWhatsAppTemplate)
    private readonly whatsappTemplateRepository: Repository<OrganizationWhatsAppTemplate>,
    @InjectRepository(OrganizationSmsSettings)
    private readonly smsSettingsRepository: Repository<OrganizationSmsSettings>,
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
        reminder24h: true,
        reminder1h: true,
        appointmentCanceled: true,
        appointmentRescheduled: true,
      });
      params = await this.notificationParamsRepository.save(params);
    }

    return params;
  }

  /**
   * Get all WhatsApp templates for an organization
   */
  private async getTemplates(organizationId: string): Promise<OrganizationWhatsAppTemplate[]> {
    return this.whatsappTemplateRepository.find({
      where: { organizationId },
    });
  }

  /**
   * Get complete WhatsApp notification settings for an organization
   */
  async getWhatsAppSettings(organizationId: string): Promise<WhatsAppNotificationSettingsResponseDto> {
    const [whatsappSettings, notificationParams, templates] = await Promise.all([
      this.getOrCreateWhatsAppSettings(organizationId),
      this.getOrCreateNotificationParams(organizationId),
      this.getTemplates(organizationId),
    ]);

    // Check if connected (has wabaId and phoneNumberId)
    const isConnected = !!(whatsappSettings.wabaId && whatsappSettings.phoneNumberId && whatsappSettings.accessToken);

    const templateResponses: WhatsAppTemplateResponseDto[] = templates.map((t) => ({
      id: t.id,
      eventType: t.eventType,
      templateName: t.templateName,
      languageCode: t.languageCode,
      status: t.status,
    }));

    return {
      enabled: whatsappSettings.enabled,
      isConnected,
      displayPhoneNumber: whatsappSettings.displayPhoneNumber || undefined,
      parameters: {
        appointmentCreated: notificationParams.appointmentCreated,
        reminder24h: notificationParams.reminder24h,
        reminder1h: notificationParams.reminder1h,
        appointmentCanceled: notificationParams.appointmentCanceled,
        appointmentRescheduled: notificationParams.appointmentRescheduled,
      },
      templates: templateResponses,
    };
  }

  /**
   * Update WhatsApp enabled status and notification parameters
   */
  async updateWhatsAppSettings(
    organizationId: string,
    dto: UpdateWhatsAppSettingsDto,
  ): Promise<WhatsAppNotificationSettingsResponseDto> {
    // Update WhatsApp settings (enabled flag)
    let whatsappSettings = await this.getOrCreateWhatsAppSettings(organizationId);
    whatsappSettings.enabled = dto.enabled;
    await this.whatsappSettingsRepository.save(whatsappSettings);

    // Update notification parameters
    let notificationParams = await this.getOrCreateNotificationParams(organizationId);
    if (dto.parameters) {
      if (dto.parameters.appointmentCreated !== undefined) {
        notificationParams.appointmentCreated = dto.parameters.appointmentCreated;
      }
      if (dto.parameters.reminder24h !== undefined) {
        notificationParams.reminder24h = dto.parameters.reminder24h;
      }
      if (dto.parameters.reminder1h !== undefined) {
        notificationParams.reminder1h = dto.parameters.reminder1h;
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
   * Assign a WhatsApp template to an event type
   * Creates or updates the template mapping
   */
  async assignTemplate(
    organizationId: string,
    dto: AssignWhatsAppTemplateDto,
  ): Promise<WhatsAppTemplateResponseDto> {
    // Check if template already exists for this event type
    let template = await this.whatsappTemplateRepository.findOne({
      where: {
        organizationId,
        eventType: dto.eventType,
      },
    });

    if (template) {
      // Update existing template
      template.templateName = dto.templateName;
      template.languageCode = dto.languageCode;
      template.status = WhatsAppTemplateStatus.PENDING; // Reset status on update
    } else {
      // Create new template
      template = this.whatsappTemplateRepository.create({
        organizationId,
        eventType: dto.eventType,
        templateName: dto.templateName,
        languageCode: dto.languageCode,
        status: WhatsAppTemplateStatus.PENDING,
      });
    }

    template = await this.whatsappTemplateRepository.save(template);

    // TODO: In future, verify template with Meta API and update status
    // This would involve calling the WhatsApp Business API to verify
    // the template exists and is approved

    return {
      id: template.id,
      eventType: template.eventType,
      templateName: template.templateName,
      languageCode: template.languageCode,
      status: template.status,
    };
  }

  /**
   * Delete a template assignment
   */
  async deleteTemplate(organizationId: string, templateId: string): Promise<void> {
    const template = await this.whatsappTemplateRepository.findOne({
      where: {
        id: templateId,
        organizationId,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.whatsappTemplateRepository.remove(template);
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

  // ==================== SMS Settings Management ====================

  /**
   * Get or create SMS settings for an organization
   */
  private async getOrCreateSmsSettings(organizationId: string): Promise<OrganizationSmsSettings> {
    let settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.smsSettingsRepository.create({
        organizationId,
        enabled: false,
      });
      settings = await this.smsSettingsRepository.save(settings);
    }

    return settings;
  }

  /**
   * Mask Account SID for display (show first 4 and last 4 characters)
   */
  private maskAccountSid(accountSid: string): string {
    if (accountSid.length <= 8) {
      return '****';
    }
    return `${accountSid.slice(0, 4)}...${accountSid.slice(-4)}`;
  }

  /**
   * Get complete SMS notification settings for an organization
   */
  async getSmsSettings(organizationId: string): Promise<SmsNotificationSettingsResponseDto> {
    const [smsSettings, notificationParams] = await Promise.all([
      this.getOrCreateSmsSettings(organizationId),
      this.getOrCreateNotificationParams(organizationId),
    ]);

    // Check if connected (has accountSid, authToken, and fromPhoneNumber)
    const isConnected = !!(smsSettings.accountSid && smsSettings.authToken && smsSettings.fromPhoneNumber);

    return {
      enabled: smsSettings.enabled,
      isConnected,
      fromPhoneNumber: smsSettings.fromPhoneNumber || undefined,
      accountSidMasked: smsSettings.accountSid ? this.maskAccountSid(smsSettings.accountSid) : undefined,
      parameters: {
        appointmentCreated: notificationParams.appointmentCreated,
        reminder24h: notificationParams.reminder24h,
        reminder1h: notificationParams.reminder1h,
        appointmentCanceled: notificationParams.appointmentCanceled,
        appointmentRescheduled: notificationParams.appointmentRescheduled,
      },
    };
  }

  /**
   * Update SMS enabled status and notification parameters
   */
  async updateSmsSettings(
    organizationId: string,
    dto: UpdateSmsSettingsDto,
  ): Promise<SmsNotificationSettingsResponseDto> {
    // Update SMS settings (enabled flag)
    let smsSettings = await this.getOrCreateSmsSettings(organizationId);
    smsSettings.enabled = dto.enabled;
    await this.smsSettingsRepository.save(smsSettings);

    // Update notification parameters if provided
    if (dto.parameters) {
      let notificationParams = await this.getOrCreateNotificationParams(organizationId);
      if (dto.parameters.appointmentCreated !== undefined) {
        notificationParams.appointmentCreated = dto.parameters.appointmentCreated;
      }
      if (dto.parameters.reminder24h !== undefined) {
        notificationParams.reminder24h = dto.parameters.reminder24h;
      }
      if (dto.parameters.reminder1h !== undefined) {
        notificationParams.reminder1h = dto.parameters.reminder1h;
      }
      if (dto.parameters.appointmentCanceled !== undefined) {
        notificationParams.appointmentCanceled = dto.parameters.appointmentCanceled;
      }
      if (dto.parameters.appointmentRescheduled !== undefined) {
        notificationParams.appointmentRescheduled = dto.parameters.appointmentRescheduled;
      }
      await this.notificationParamsRepository.save(notificationParams);
    }

    return this.getSmsSettings(organizationId);
  }

  /**
   * Connect Twilio SMS
   * Stores encrypted auth token
   */
  async connectSms(
    organizationId: string,
    dto: ConnectSmsDto,
  ): Promise<SmsNotificationSettingsResponseDto> {
    let settings = await this.getOrCreateSmsSettings(organizationId);

    settings.accountSid = dto.accountSid;
    settings.authToken = this.encrypt(dto.authToken);
    settings.fromPhoneNumber = dto.fromPhoneNumber;

    await this.smsSettingsRepository.save(settings);

    this.logger.log(`Twilio SMS connected for organization ${organizationId}`);

    return this.getSmsSettings(organizationId);
  }

  /**
   * Disconnect Twilio SMS
   */
  async disconnectSms(organizationId: string): Promise<SmsNotificationSettingsResponseDto> {
    let settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    if (settings) {
      settings.accountSid = null;
      settings.authToken = null;
      settings.fromPhoneNumber = null;
      settings.enabled = false;
      await this.smsSettingsRepository.save(settings);
    }

    this.logger.log(`Twilio SMS disconnected for organization ${organizationId}`);

    return this.getSmsSettings(organizationId);
  }

  /**
   * Check if SMS is enabled and connected for an organization
   */
  async isSmsReady(organizationId: string): Promise<boolean> {
    const settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    return !!(settings?.enabled && settings?.accountSid && settings?.authToken && settings?.fromPhoneNumber);
  }
}
