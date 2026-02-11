import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, In } from 'typeorm';
import {
  OrganizationWhatsAppSettings,
} from '../notification-settings/entities/organization-whatsapp-settings.entity';
import {
  OrganizationNotificationParameters,
} from '../notification-settings/entities/organization-notification-parameters.entity';
import {
  OrganizationWhatsAppTemplate,
  WhatsAppEventType,
  WhatsAppTemplateStatus,
} from '../notification-settings/entities/organization-whatsapp-template.entity';
import * as crypto from 'crypto';

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
 * Template component types for WhatsApp API
 */
interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string };
  }>;
  sub_type?: 'url' | 'quick_reply';
  index?: number;
}

/**
 * Appointment data for template parameters
 */
export interface AppointmentNotificationData {
  organizationId: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  appointmentDate: Date;
  providerName?: string;
  organizationName?: string;
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
  private readonly apiVersion = 'v18.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  constructor(
    @InjectRepository(OrganizationWhatsAppSettings)
    private readonly whatsappSettingsRepository: Repository<OrganizationWhatsAppSettings>,
    @InjectRepository(OrganizationNotificationParameters)
    private readonly notificationParamsRepository: Repository<OrganizationNotificationParameters>,
    @InjectRepository(OrganizationWhatsAppTemplate)
    private readonly whatsappTemplateRepository: Repository<OrganizationWhatsAppTemplate>,
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
   * Format phone number to E.164 format for WhatsApp API
   * Removes spaces, dashes, and ensures it starts with country code
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters except leading +
    let formatted = phone.replace(/[^\d+]/g, '');

    // If it starts with +, remove it (API doesn't want the +)
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }

    // If it doesn't start with a country code, assume it needs one
    // This is a basic check - in production, you might want more sophisticated handling
    if (formatted.length <= 10) {
      // Assume US/Canada if 10 digits
      formatted = '1' + formatted;
    }

    return formatted;
  }

  /**
   * Format date for display in WhatsApp messages
   */
  private formatDateTime(date: Date, locale: string = 'en'): string {
    return date.toLocaleString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Check if WhatsApp is ready to send messages for an organization
   */
  async isWhatsAppReady(organizationId: string): Promise<boolean> {
    const settings = await this.whatsappSettingsRepository.findOne({
      where: { organizationId },
    });

    return !!(settings?.enabled && settings?.wabaId && settings?.phoneNumberId && settings?.accessToken);
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

    if (!isReady || !params) {
      return false;
    }

    switch (eventType) {
      case WhatsAppEventType.APPOINTMENT_CREATED:
        return params.appointmentCreated;
      case WhatsAppEventType.REMINDER_24H:
        return params.reminder24h;
      case WhatsAppEventType.REMINDER_1H:
        return params.reminder1h;
      case WhatsAppEventType.APPOINTMENT_CANCELED:
        return params.appointmentCanceled;
      case WhatsAppEventType.APPOINTMENT_RESCHEDULED:
        return params.appointmentRescheduled;
      default:
        return false;
    }
  }

  /**
   * Get the template configuration for a specific event type
   */
  async getTemplate(
    organizationId: string,
    eventType: WhatsAppEventType,
  ): Promise<OrganizationWhatsAppTemplate | null> {
    return this.whatsappTemplateRepository.findOne({
      where: {
        organizationId,
        eventType,
        status: WhatsAppTemplateStatus.APPROVED,
      },
    });
  }

  /**
   * Build template components with appointment data
   * This creates the parameters array for the WhatsApp template
   */
  private buildTemplateComponents(
    eventType: WhatsAppEventType,
    data: AppointmentNotificationData,
  ): TemplateComponent[] {
    const formattedDate = this.formatDateTime(data.appointmentDate);

    // Body component with parameters - order depends on template configuration
    // Standard appointment notification templates typically include:
    // {{1}} - Client name
    // {{2}} - Service name
    // {{3}} - Date/time
    // {{4}} - Provider name (optional)
    // {{5}} - Organization name (optional)

    const bodyParameters: Array<{ type: 'text'; text: string }> = [
      { type: 'text', text: data.clientName },
      { type: 'text', text: data.serviceName },
      { type: 'text', text: formattedDate },
    ];

    if (data.providerName) {
      bodyParameters.push({ type: 'text', text: data.providerName });
    }

    if (data.organizationName) {
      bodyParameters.push({ type: 'text', text: data.organizationName });
    }

    // Add event-specific parameters
    if (eventType === WhatsAppEventType.APPOINTMENT_CANCELED && data.cancellationReason) {
      bodyParameters.push({ type: 'text', text: data.cancellationReason });
    }

    const components: TemplateComponent[] = [
      {
        type: 'body',
        parameters: bodyParameters,
      },
    ];

    // Add button component if there's a confirmation link
    if (data.confirmationLink && eventType === WhatsAppEventType.APPOINTMENT_CREATED) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          { type: 'text', text: data.confirmationLink },
        ],
      });
    }

    return components;
  }

  /**
   * Send a WhatsApp template message via Meta Cloud API
   */
  async sendTemplateMessage(
    organizationId: string,
    to: string,
    templateName: string,
    languageCode: string,
    components: TemplateComponent[],
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

      // Build the API request
      const url = `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
          components,
        },
      };

      this.logger.debug(`Sending WhatsApp message to ${formattedPhone}`, {
        template: templateName,
        language: languageCode,
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
   * Send appointment notification via WhatsApp
   * This is the main method to use from other services
   */
  async sendAppointmentNotification(
    eventType: WhatsAppEventType,
    data: AppointmentNotificationData,
  ): Promise<WhatsAppSendResult> {
    try {
      // Check if we should send this notification
      const shouldSend = await this.shouldSendNotification(data.organizationId, eventType);
      if (!shouldSend) {
        this.logger.debug(`Skipping WhatsApp notification for ${eventType} - disabled or not configured`);
        return {
          success: false,
          error: 'Notification type disabled or WhatsApp not configured',
        };
      }

      // Get the template for this event type
      const template = await this.getTemplate(data.organizationId, eventType);
      if (!template) {
        this.logger.warn(`No approved template found for ${eventType} in organization ${data.organizationId}`);
        return {
          success: false,
          error: 'No approved template configured for this event type',
        };
      }

      // Build template components
      const components = this.buildTemplateComponents(eventType, data);

      // Send the message
      return this.sendTemplateMessage(
        data.organizationId,
        data.clientPhone,
        template.templateName,
        template.languageCode,
        components,
      );
    } catch (error) {
      this.logger.error(`Failed to send ${eventType} notification`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send appointment created notification
   */
  async sendAppointmentCreatedNotification(
    data: AppointmentNotificationData,
  ): Promise<WhatsAppSendResult> {
    return this.sendAppointmentNotification(WhatsAppEventType.APPOINTMENT_CREATED, data);
  }

  /**
   * Send 24-hour reminder notification
   */
  async sendReminder24hNotification(
    data: AppointmentNotificationData,
  ): Promise<WhatsAppSendResult> {
    return this.sendAppointmentNotification(WhatsAppEventType.REMINDER_24H, data);
  }

  /**
   * Send 1-hour reminder notification
   */
  async sendReminder1hNotification(
    data: AppointmentNotificationData,
  ): Promise<WhatsAppSendResult> {
    return this.sendAppointmentNotification(WhatsAppEventType.REMINDER_1H, data);
  }

  /**
   * Send appointment canceled notification
   */
  async sendAppointmentCanceledNotification(
    data: AppointmentNotificationData,
  ): Promise<WhatsAppSendResult> {
    return this.sendAppointmentNotification(WhatsAppEventType.APPOINTMENT_CANCELED, data);
  }

  /**
   * Send appointment rescheduled notification
   */
  async sendAppointmentRescheduledNotification(
    data: AppointmentNotificationData,
  ): Promise<WhatsAppSendResult> {
    return this.sendAppointmentNotification(WhatsAppEventType.APPOINTMENT_RESCHEDULED, data);
  }

  /**
   * Get organizations that need reminders sent
   * Used by scheduled tasks to find appointments that need reminders
   */
  async getOrganizationsWithWhatsAppEnabled(): Promise<string[]> {
    const settings = await this.whatsappSettingsRepository.find({
      where: { enabled: true },
      select: ['organizationId'],
    });
    return settings.map(s => s.organizationId);
  }
}
