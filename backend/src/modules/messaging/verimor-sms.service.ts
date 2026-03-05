import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  OrganizationSmsSettings,
} from '../notification-settings/entities/organization-sms-settings.entity';
import {
  OrganizationNotificationParameters,
} from '../notification-settings/entities/organization-notification-parameters.entity';
import {
  SmsTemplate,
} from '../notification-settings/entities/sms-template.entity';
import {
  OrganizationSettings,
} from '../settings/entities/organization-settings.entity';

/**
 * SMS notification event types
 */
export enum SmsEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
}

/**
 * Verimor SMS API response types
 */
interface VerimorSendResponse {
  campaign_id: number;
}

interface VerimorErrorResponse {
  error: string;
}

/**
 * Appointment data for SMS messages
 */
export interface SmsNotificationData {
  organizationId: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  appointmentDate: Date;
  providerName?: string;
  organizationName?: string;
  confirmationLink?: string;
  appointmentLink?: string;
  cancellationReason?: string;
}

/**
 * Result of sending an SMS
 */
export interface SmsSendResult {
  success: boolean;
  campaignId?: number;
  error?: string;
}

/**
 * Verimor SMS Service
 * 
 * Integrates with Verimor SMS API for sending SMS notifications.
 * @see https://github.com/verimor/SMS-API
 */
@Injectable()
export class VerimorSmsService {
  private readonly logger = new Logger(VerimorSmsService.name);
  private readonly baseUrl = 'https://sms.verimor.com.tr';
  private readonly apiVersion = 'v2';

  constructor(
    @InjectRepository(OrganizationSmsSettings)
    private readonly smsSettingsRepository: Repository<OrganizationSmsSettings>,
    @InjectRepository(OrganizationNotificationParameters)
    private readonly notificationParamsRepository: Repository<OrganizationNotificationParameters>,
    @InjectRepository(SmsTemplate)
    private readonly smsTemplateRepository: Repository<SmsTemplate>,
    @InjectRepository(OrganizationSettings)
    private readonly organizationSettingsRepository: Repository<OrganizationSettings>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Format phone number for Verimor API (Turkish format: 905XXXXXXXXX)
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let formatted = phone.replace(/[^\d+]/g, '');

    // Remove leading +
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }

    // If starts with 0, replace with 90 (Turkish country code)
    if (formatted.startsWith('0')) {
      formatted = '90' + formatted.substring(1);
    }

    // If doesn't start with country code, assume Turkish number
    if (formatted.length === 10) {
      formatted = '90' + formatted;
    }

    return formatted;
  }

  /**
   * Check if SMS is ready to send messages for an organization
   */
  async isSmsReady(organizationId: string): Promise<boolean> {
    const settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    // If organization has SMS enabled with custom credentials
    if (settings?.enabled && settings.username && settings.password && !settings.useGlobalCredentials) {
      return true;
    }

    // If organization has SMS enabled and wants to use global credentials
    if (settings?.enabled && settings.useGlobalCredentials) {
      const globalUsername = this.configService.get<string>('VERIMOR_USERNAME');
      const globalPassword = this.configService.get<string>('VERIMOR_PASSWORD');
      return !!(globalUsername && globalPassword);
    }

    // If no organization settings exist, check if global credentials are available
    // This allows SMS to work "out of the box" when env vars are set
    if (!settings) {
      const globalUsername = this.configService.get<string>('VERIMOR_USERNAME');
      const globalPassword = this.configService.get<string>('VERIMOR_PASSWORD');
      if (globalUsername && globalPassword) {
        this.logger.debug(`SMS ready for ${organizationId} via global credentials (no org settings)`);
        return true;
      }
    }

    return false;
  }

  /**
   * Get SMS credentials (organization-specific or global)
   */
  private async getCredentials(organizationId: string): Promise<{ username: string; password: string; sourceAddr: string } | null> {
    const settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    // If organization has custom credentials and is NOT using global
    if (settings?.username && settings?.password && !settings.useGlobalCredentials) {
      this.logger.debug(`Using organization-specific SMS credentials for ${organizationId}`);
      return {
        username: settings.username,
        password: settings.password,
        sourceAddr: settings.sourceAddr || this.configService.get<string>('VERIMOR_SOURCE_ADDR') || '',
      };
    }

    // Fall back to global credentials
    const globalUsername = this.configService.get<string>('VERIMOR_USERNAME');
    const globalPassword = this.configService.get<string>('VERIMOR_PASSWORD');
    const globalSourceAddr = this.configService.get<string>('VERIMOR_SOURCE_ADDR') || '';

    if (globalUsername && globalPassword) {
      this.logger.debug(`Using global SMS credentials for ${organizationId}`);
      return {
        username: globalUsername,
        password: globalPassword,
        sourceAddr: globalSourceAddr,
      };
    }

    this.logger.warn(`No SMS credentials available for ${organizationId}`);
    return null;
  }

  /**
   * Check if a specific event type should trigger SMS notification
   */
  async shouldSendNotification(
    organizationId: string,
    eventType: SmsEventType,
  ): Promise<boolean> {
    const settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    // If organization has explicit SMS settings
    if (settings) {
      // If SMS is explicitly disabled, don't send
      if (!settings.enabled) {
        this.logger.debug(`SMS explicitly disabled for organization ${organizationId}`);
        return false;
      }
    } else {
      // No organization settings - check if global credentials are available
      // If global credentials exist, allow sending by default
      const globalUsername = this.configService.get<string>('VERIMOR_USERNAME');
      const globalPassword = this.configService.get<string>('VERIMOR_PASSWORD');
      if (!globalUsername || !globalPassword) {
        this.logger.debug(`No SMS settings for ${organizationId} and no global credentials`);
        return false;
      }
      this.logger.debug(`Using global SMS credentials for ${organizationId}`);
    }

    // Check notification parameters for this event type
    const params = await this.notificationParamsRepository.findOne({
      where: { organizationId },
    });

    // If no params exist, default to sending all notifications
    if (!params) {
      this.logger.debug(`No notification params found for ${organizationId}, defaulting to send all`);
      return true;
    }

    switch (eventType) {
      case SmsEventType.APPOINTMENT_CREATED:
        return params.appointmentCreated;
      case SmsEventType.APPOINTMENT_REMINDER:
        return params.appointmentReminder;
      case SmsEventType.APPOINTMENT_CANCELED:
        return params.appointmentCanceled;
      case SmsEventType.APPOINTMENT_RESCHEDULED:
        return params.appointmentRescheduled;
      default:
        return false;
    }
  }

  /**
   * Get SMS template for an organization and event type
   */
  private async getTemplate(
    organizationId: string,
    eventType: SmsEventType,
    language: string,
  ): Promise<SmsTemplate | null> {
    // First try to get organization-specific template
    let template = await this.smsTemplateRepository.findOne({
      where: {
        organizationId,
        eventType,
        language,
        isActive: true,
      },
    });

    if (template) {
      return template;
    }

    // Fall back to default template (no organization ID)
    template = await this.smsTemplateRepository.findOne({
      where: {
        organizationId: IsNull(),
        eventType,
        language,
        isActive: true,
        isDefault: true,
      },
    });

    this.logger.debug(`Looking for default template: eventType=${eventType}, language=${language}, found=${!!template}`);

    // If no template found for the specified language, try English as fallback
    if (!template && language !== 'en') {
      template = await this.smsTemplateRepository.findOne({
        where: {
          organizationId: IsNull(),
          eventType,
          language: 'en',
          isActive: true,
          isDefault: true,
        },
      });
      this.logger.debug(`Fallback to English template: found=${!!template}`);
    }

    return template;
  }

  /**
   * Replace template variables with actual values
   */
  private replaceVariables(template: string, data: SmsNotificationData): string {
    const formattedDate = data.appointmentDate.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = data.appointmentDate.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return template
      .replace(/\{\{clientName\}\}/g, data.clientName)
      .replace(/\{\{serviceName\}\}/g, data.serviceName)
      .replace(/\{\{appointmentDate\}\}/g, formattedDate)
      .replace(/\{\{appointmentTime\}\}/g, formattedTime)
      .replace(/\{\{providerName\}\}/g, data.providerName || '-')
      .replace(/\{\{organizationName\}\}/g, data.organizationName || '-')
      .replace(/\{\{confirmationLink\}\}/g, data.confirmationLink || '')
      .replace(/\{\{appointmentLink\}\}/g, data.appointmentLink || '')
      .replace(/\{\{cancellationReason\}\}/g, data.cancellationReason || '');
  }

  /**
   * Send an SMS via Verimor API
   */
  async sendSms(
    organizationId: string,
    to: string,
    message: string,
  ): Promise<SmsSendResult> {
    try {
      const credentials = await this.getCredentials(organizationId);

      if (!credentials) {
        this.logger.warn(`SMS not configured for organization ${organizationId} and no global credentials`);
        return {
          success: false,
          error: 'SMS not configured for this organization',
        };
      }

      const formattedPhone = this.formatPhoneNumber(to);
      const url = `${this.baseUrl}/${this.apiVersion}/send.json`;

      // Determine datacoding based on message content
      // datacoding=1 for Turkish characters (Ş ş Ğ ğ ç ı İ)
      const hasTurkishChars = /[ŞşĞğçıİ]/.test(message);
      const datacoding = hasTurkishChars ? 1 : 0;

      const payload = {
        username: credentials.username,
        password: credentials.password,
        source_addr: credentials.sourceAddr,
        messages: [
          {
            msg: message,
            dest: formattedPhone,
          },
        ],
        datacoding,
      };

      this.logger.debug(`Sending SMS to ${formattedPhone}`, {
        url,
        messageLength: message.length,
        datacoding,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      this.logger.debug('Verimor API response', {
        status: response.status,
        response: responseText,
      });

      if (!response.ok) {
        this.logger.error('Verimor API error', {
          status: response.status,
          error: responseText,
        });
        return {
          success: false,
          error: responseText || 'Unknown error from Verimor API',
        };
      }

      // Verimor returns campaign ID as plain text on success
      const campaignId = parseInt(responseText, 10);

      if (isNaN(campaignId)) {
        // Response might be an error message
        return {
          success: false,
          error: responseText,
        };
      }

      this.logger.log(`SMS sent successfully to ${formattedPhone}`, {
        campaignId,
      });

      return {
        success: true,
        campaignId,
      };
    } catch (error) {
      this.logger.error('Failed to send SMS', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send appointment notification via SMS
   */
  async sendAppointmentNotification(
    eventType: SmsEventType,
    data: SmsNotificationData,
  ): Promise<SmsSendResult> {
    try {
      this.logger.debug(`Attempting to send SMS notification for ${eventType} to ${data.clientPhone} (org: ${data.organizationId})`);

      // Check if we should send this notification
      const shouldSend = await this.shouldSendNotification(data.organizationId, eventType);
      if (!shouldSend) {
        this.logger.debug(`Skipping SMS notification for ${eventType} - disabled or not configured`);
        return {
          success: false,
          error: 'Notification type disabled or SMS not configured',
        };
      }

      // Get organization settings for language
      const smsSettings = await this.smsSettingsRepository.findOne({
        where: { organizationId: data.organizationId },
      });
      const language = smsSettings?.templateLanguage || 'tr';

      // Get organization settings for auto-confirm check
      const orgSettings = await this.organizationSettingsRepository.findOne({
        where: { organizationId: data.organizationId },
      });

      // Only include confirmation link for REMINDER notifications when auto-confirm is OFF
      const modifiedData = { ...data };
      if (eventType !== SmsEventType.APPOINTMENT_REMINDER) {
        // No confirmation link for non-reminder notifications
        modifiedData.confirmationLink = '';
      } else if (orgSettings?.autoConfirmAppointments) {
        // No confirmation link if auto-confirm is ON
        modifiedData.confirmationLink = '';
      }

      // Get template for this event type
      const template = await this.getTemplate(data.organizationId, eventType, language);

      if (!template) {
        this.logger.warn(`No SMS template found for ${eventType} in language ${language}`);
        return {
          success: false,
          error: 'No SMS template configured for this notification type',
        };
      }

      // Replace variables in template
      const message = this.replaceVariables(template.content, modifiedData);

      // Send the SMS
      return this.sendSms(data.organizationId, data.clientPhone, message);
    } catch (error) {
      this.logger.error(`Failed to send ${eventType} SMS notification`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send appointment created notification
   */
  async sendAppointmentCreatedNotification(data: SmsNotificationData): Promise<SmsSendResult> {
    this.logger.debug(`Sending appointment created SMS notification to ${data.clientPhone} for organization ${data.organizationId}`);
    return this.sendAppointmentNotification(SmsEventType.APPOINTMENT_CREATED, data);
  }

  /**
   * Send appointment reminder notification
   */
  async sendAppointmentReminderNotification(data: SmsNotificationData): Promise<SmsSendResult> {
    return this.sendAppointmentNotification(SmsEventType.APPOINTMENT_REMINDER, data);
  }

  /**
   * Send appointment canceled notification
   */
  async sendAppointmentCanceledNotification(data: SmsNotificationData): Promise<SmsSendResult> {
    return this.sendAppointmentNotification(SmsEventType.APPOINTMENT_CANCELED, data);
  }

  /**
   * Send appointment rescheduled notification
   */
  async sendAppointmentRescheduledNotification(data: SmsNotificationData): Promise<SmsSendResult> {
    return this.sendAppointmentNotification(SmsEventType.APPOINTMENT_RESCHEDULED, data);
  }

  /**
   * Check SMS balance via Verimor API
   */
  async checkBalance(organizationId: string): Promise<{ success: boolean; balance?: number; error?: string }> {
    try {
      const credentials = await this.getCredentials(organizationId);

      if (!credentials) {
        return { success: false, error: 'SMS not configured' };
      }

      const url = `${this.baseUrl}/${this.apiVersion}/balance?username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`;

      const response = await fetch(url, {
        method: 'GET',
      });

      const responseText = await response.text();

      if (!response.ok) {
        return { success: false, error: responseText };
      }

      const balance = parseFloat(responseText);
      if (isNaN(balance)) {
        return { success: false, error: responseText };
      }

      return { success: true, balance };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get organizations that have SMS enabled
   */
  async getOrganizationsWithSmsEnabled(): Promise<string[]> {
    const settings = await this.smsSettingsRepository.find({
      where: { enabled: true },
      select: ['organizationId'],
    });
    return settings.map(s => s.organizationId);
  }
}
