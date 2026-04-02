import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  OrganizationWhatsAppSettings,
} from '../notification-settings/entities/organization-whatsapp-settings.entity';
import {
  OrganizationNotificationParameters,
} from '../notification-settings/entities/organization-notification-parameters.entity';
import * as crypto from 'crypto';
import {
  formatDateInTimezone,
  formatTimeInTimezone,
} from '../../common/utils/timezone.util';

/**
 * WhatsApp notification event types
 */
export enum WhatsAppEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
}

/**
 * WhatsApp Cloud API response types
 */
interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

interface WhatsAppApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

/**
 * WhatsApp template parameter
 */
interface WhatsAppTemplateParameter {
  type: 'text' | 'currency' | 'date_time';
  text?: string;
}

/**
 * WhatsApp template component
 */
interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: WhatsAppTemplateParameter[];
  sub_type?: 'url' | 'quick_reply';
  index?: number;
}

/**
 * Configuration for a WhatsApp template message
 */
export interface WhatsAppTemplateConfig {
  name: string;
  language: string;
  components?: WhatsAppTemplateComponent[];
}

/**
 * Appointment data for WhatsApp messages
 */
export interface AppointmentNotificationData {
  organizationId: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  appointmentDate: Date;
  /** Organization timezone for formatting dates (IANA format, e.g., 'Europe/Istanbul') */
  timezone?: string;
  providerName?: string;
  organizationName?: string;
  /** Link to manage/view the appointment */
  appointmentLink?: string;
  /** Link to confirm the appointment */
  confirmationLink?: string;
  cancellationReason?: string;
}

/**
 * Result of sending a WhatsApp message
 */
export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';
  private readonly apiVersion = 'v22.0';
  private readonly baseUrl = 'https://graph.facebook.com';

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
   * Format phone number for WhatsApp API (without +)
   */
  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/[^\d+]/g, '');

    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }

    if (formatted.length <= 10) {
      formatted = '1' + formatted;
    }

    return formatted;
  }

  /**
   * Check if WhatsApp is ready to send messages for an organization
   */
  async isWhatsAppReady(organizationId: string): Promise<boolean> {
    const settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    this.logger.debug(`WhatsApp settings for ${organizationId}:`, {
      exists: !!settings,
      enabled: settings?.enabled,
      hasPhoneNumberId: !!settings?.phoneNumberId,
      hasAccessToken: !!settings?.accessToken,
    });

    return !!(settings?.enabled && settings?.phoneNumberId && settings?.accessToken);
  }

  /**
   * Check if a specific event type should trigger WhatsApp notification
   */
  async shouldSendNotification(
    organizationId: string,
    eventType: WhatsAppEventType,
  ): Promise<boolean> {
    const [isReady, params] = await Promise.all([
      this.isWhatsAppReady(organizationId),
      this.notificationParamsRepository.findOne({ where: { organizationId } }),
    ]);

    if (!isReady) {
      this.logger.debug(`WhatsApp not ready for organization ${organizationId}`);
      return false;
    }

    // If no params exist, default to sending all notifications
    if (!params) {
      this.logger.debug(`No notification params found for ${organizationId}, defaulting to send all`);
      return true;
    }

    switch (eventType) {
      case WhatsAppEventType.APPOINTMENT_CREATED:
        return params.appointmentCreated;
      case WhatsAppEventType.APPOINTMENT_REMINDER:
        return params.appointmentReminder;
      case WhatsAppEventType.APPOINTMENT_CANCELED:
        return params.appointmentCanceled;
      case WhatsAppEventType.APPOINTMENT_RESCHEDULED:
        return params.appointmentRescheduled;
      default:
        return false;
    }
  }

  /**
   * Send a WhatsApp template message via Meta Cloud API
   * Template messages are required for initiating conversations (24-hour rule)
   */
  async sendWhatsAppTemplateMessage(
    organizationId: string,
    to: string,
    templateConfig: WhatsAppTemplateConfig,
  ): Promise<WhatsAppSendResult> {
    try {
      // Get organization WhatsApp settings
      const settings = await this.whatsappSettingsRepository.findOne({
        where: { organizationId },
      });

      if (!settings?.accessToken || !settings?.phoneNumberId) {
        this.logger.warn(`WhatsApp not configured for organization ${organizationId}`);
        return {
          success: false,
          error: 'WhatsApp not configured for this organization',
        };
      }

      // Decrypt access token
      const accessToken = this.decrypt(settings.accessToken);
      const phoneNumberId = settings.phoneNumberId;

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(to);

      // Build the API request for template message
      const url = `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`;

      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateConfig.name,
          language: {
            code: templateConfig.language,
          },
          ...(templateConfig.components && templateConfig.components.length > 0
            ? { components: templateConfig.components }
            : {}),
        },
      };

      this.logger.debug(`Sending WhatsApp template message to ${formattedPhone}`, {
        url,
        template: templateConfig.name,
        language: templateConfig.language,
      });

      // Make the API call
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      this.logger.debug('WhatsApp API response', {
        status: response.status,
        response: responseData,
      });

      if (!response.ok) {
        const errorData = responseData as WhatsAppApiError;
        this.logger.error('WhatsApp API error', {
          status: response.status,
          error: errorData.error,
          template: templateConfig.name,
        });
        return {
          success: false,
          error: errorData.error?.message || 'Unknown error from WhatsApp API',
        };
      }

      const successData = responseData as WhatsAppApiResponse;
      this.logger.log(`WhatsApp template message sent successfully to ${formattedPhone}`, {
        messageId: successData.messages?.[0]?.id,
        template: templateConfig.name,
      });

      return {
        success: true,
        messageId: successData.messages?.[0]?.id,
      };
    } catch (error) {
      this.logger.error('Failed to send WhatsApp template message', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a WhatsApp text message via Meta Cloud API
   * Note: Text messages can only be sent within 24 hours of receiving a message from the user
   */
  async sendWhatsAppMessage(
    organizationId: string,
    to: string,
    body: string,
  ): Promise<WhatsAppSendResult> {
    try {
      // Get organization WhatsApp settings
      const settings = await this.whatsappSettingsRepository.findOne({
        where: { organizationId },
      });

      if (!settings?.accessToken || !settings?.phoneNumberId) {
        this.logger.warn(`WhatsApp not configured for organization ${organizationId}`);
        return {
          success: false,
          error: 'WhatsApp not configured for this organization',
        };
      }

      // Decrypt access token
      const accessToken = this.decrypt(settings.accessToken);
      const phoneNumberId = settings.phoneNumberId;

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(to);

      // Build the API request for text message
      const url = `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: body,
        },
      };

      this.logger.debug(`Sending WhatsApp message to ${formattedPhone}`, {
        url,
        bodyLength: body.length,
      });

      // Make the API call
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      this.logger.debug('WhatsApp API response', {
        status: response.status,
        response: responseData,
      });

      if (!response.ok) {
        const errorData = responseData as WhatsAppApiError;
        this.logger.error('WhatsApp API error', {
          status: response.status,
          error: errorData.error,
        });
        return {
          success: false,
          error: errorData.error?.message || 'Unknown error from WhatsApp API',
        };
      }

      const successData = responseData as WhatsAppApiResponse;
      this.logger.log(`WhatsApp message sent successfully to ${formattedPhone}`, {
        messageId: successData.messages?.[0]?.id,
      });

      return {
        success: true,
        messageId: successData.messages?.[0]?.id,
      };
    } catch (error) {
      this.logger.error('Failed to send WhatsApp message', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get template name for a specific event type
   * Template names follow a convention: appointment_created, appointment_reminder, etc.
   */
  private getTemplateNameForEvent(eventType: WhatsAppEventType): string {
    switch (eventType) {
      case WhatsAppEventType.APPOINTMENT_CREATED:
        return 'appointment_created';
      case WhatsAppEventType.APPOINTMENT_REMINDER:
        return 'appointment_reminder';
      case WhatsAppEventType.APPOINTMENT_CANCELED:
        return 'appointment_canceled';
      case WhatsAppEventType.APPOINTMENT_RESCHEDULED:
        return 'appointment_rescheduled';
      default:
        return 'appointment_created';
    }
  }

  /**
   * Get template configuration for a specific event type
   * All templates receive the same standard parameters:
   * 1. clientName
   * 2. serviceName  
   * 3. appointmentDate
   * 4. appointmentTime
   * 5. providerName
   * 6. organizationName
   * 7. appointmentLink
   * 8. confirmationLink
   */
  private async getTemplateConfig(
    organizationId: string,
    eventType: WhatsAppEventType,
    data: AppointmentNotificationData,
  ): Promise<WhatsAppTemplateConfig | null> {
    const settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      return null;
    }

    // Get template name based on event type
    const templateName = this.getTemplateNameForEvent(eventType);
    const language = settings.templateLanguage || 'en_US';

    // Format date and time for template parameters using organization timezone
    const timezone = data.timezone || 'UTC';
    const formattedDate = formatDateInTimezone(data.appointmentDate, timezone, 'tr-TR');
    const formattedTime = formatTimeInTimezone(data.appointmentDate, timezone, 'tr-TR');

    // Build template components with standard parameters
    // All templates receive the same 8 parameters in order
    const components: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: data.clientName },
          { type: 'text', text: data.serviceName },
          { type: 'text', text: formattedDate },
          { type: 'text', text: formattedTime },
          { type: 'text', text: data.providerName || '-' },
          { type: 'text', text: data.organizationName || '-' },
          { type: 'text', text: data.appointmentLink || '-' },
          { type: 'text', text: data.confirmationLink || '-' },
        ],
      },
    ];

    return {
      name: templateName,
      language,
      components,
    };
  }

  /**
   * Send appointment notification via WhatsApp using templates
   */
  async sendAppointmentNotification(
    eventType: WhatsAppEventType,
    data: AppointmentNotificationData,
  ): Promise<WhatsAppSendResult> {
    try {
      this.logger.debug(`Attempting to send WhatsApp notification for ${eventType} to ${data.clientPhone} (org: ${data.organizationId})`);

      // Check if we should send this notification
      const shouldSend = await this.shouldSendNotification(data.organizationId, eventType);
      if (!shouldSend) {
        this.logger.debug(`Skipping WhatsApp notification for ${eventType} - disabled or not configured`);
        return {
          success: false,
          error: 'Notification type disabled or WhatsApp not configured',
        };
      }

      // Get template configuration for this event type
      const templateConfig = await this.getTemplateConfig(data.organizationId, eventType, data);
      
      if (!templateConfig) {
        this.logger.warn(`No template configuration found for ${eventType}`);
        return {
          success: false,
          error: 'No template configured for this notification type',
        };
      }

      // Send the template message
      return this.sendWhatsAppTemplateMessage(data.organizationId, data.clientPhone, templateConfig);
    } catch (error) {
      this.logger.error(`Failed to send ${eventType} WhatsApp notification`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send appointment created notification
   */
  async sendAppointmentCreatedNotification(data: AppointmentNotificationData): Promise<WhatsAppSendResult> {
    this.logger.debug(`Sending appointment created WhatsApp notification to ${data.clientPhone} for organization ${data.organizationId}`);
    return this.sendAppointmentNotification(WhatsAppEventType.APPOINTMENT_CREATED, data);
  }

  /**
   * Send appointment reminder notification
   */
  async sendAppointmentReminderNotification(data: AppointmentNotificationData): Promise<WhatsAppSendResult> {
    return this.sendAppointmentNotification(WhatsAppEventType.APPOINTMENT_REMINDER, data);
  }

  /**
   * Send appointment canceled notification
   */
  async sendAppointmentCanceledNotification(data: AppointmentNotificationData): Promise<WhatsAppSendResult> {
    return this.sendAppointmentNotification(WhatsAppEventType.APPOINTMENT_CANCELED, data);
  }

  /**
   * Send appointment rescheduled notification
   */
  async sendAppointmentRescheduledNotification(data: AppointmentNotificationData): Promise<WhatsAppSendResult> {
    return this.sendAppointmentNotification(WhatsAppEventType.APPOINTMENT_RESCHEDULED, data);
  }

  /**
   * Get organizations that have WhatsApp enabled
   */
  async getOrganizationsWithWhatsAppEnabled(): Promise<string[]> {
    const settings = await this.whatsappSettingsRepository.find({
      where: { enabled: true },
      select: ['organizationId'],
    });
    return settings.map(s => s.organizationId);
  }
}
