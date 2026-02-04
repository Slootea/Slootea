import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  OrganizationSmsSettings,
} from '../notification-settings/entities/organization-sms-settings.entity';
import {
  OrganizationNotificationParameters,
} from '../notification-settings/entities/organization-notification-parameters.entity';

/**
 * SMS notification event types (aligned with WhatsApp events)
 */
export enum SmsEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  REMINDER_24H = 'REMINDER_24H',
  REMINDER_1H = 'REMINDER_1H',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
}

/**
 * Notification data for SMS messages
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
  cancellationReason?: string;
}

/**
 * Result of sending an SMS
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  constructor(
    @InjectRepository(OrganizationSmsSettings)
    private readonly smsSettingsRepository: Repository<OrganizationSmsSettings>,
    @InjectRepository(OrganizationNotificationParameters)
    private readonly notificationParamsRepository: Repository<OrganizationNotificationParameters>,
    private readonly configService: ConfigService,
  ) {
    // Get encryption key from environment or generate a default for development
    const keyString = this.configService.get<string>('SMS_TOKEN_ENCRYPTION_KEY') ||
                      this.configService.get<string>('WHATSAPP_TOKEN_ENCRYPTION_KEY');
    if (keyString) {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else {
      // Default key for development - MUST be replaced in production
      this.logger.warn('SMS_TOKEN_ENCRYPTION_KEY not set, using default key (NOT SAFE FOR PRODUCTION)');
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
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/[^\d+]/g, '');

    if (!formatted.startsWith('+')) {
      // If no +, assume it needs one
      if (formatted.length === 10) {
        // Assume US/Canada
        formatted = '+1' + formatted;
      } else {
        formatted = '+' + formatted;
      }
    }

    return formatted;
  }

  /**
   * Format date for display in SMS messages
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
   * Check if SMS is ready to send messages for an organization
   */
  async isSmsReady(organizationId: string): Promise<boolean> {
    const settings = await this.smsSettingsRepository.findOne({
      where: { organizationId },
    });

    return !!(settings?.enabled && settings?.accountSid && settings?.authToken && settings?.fromPhoneNumber);
  }

  /**
   * Check if a specific event type should trigger SMS notification
   */
  async shouldSendNotification(
    organizationId: string,
    eventType: SmsEventType,
  ): Promise<boolean> {
    const [isReady, params] = await Promise.all([
      this.isSmsReady(organizationId),
      this.notificationParamsRepository.findOne({ where: { organizationId } }),
    ]);

    if (!isReady || !params) {
      return false;
    }

    switch (eventType) {
      case SmsEventType.APPOINTMENT_CREATED:
        return params.appointmentCreated;
      case SmsEventType.REMINDER_24H:
        return params.reminder24h;
      case SmsEventType.REMINDER_1H:
        return params.reminder1h;
      case SmsEventType.APPOINTMENT_CANCELED:
        return params.appointmentCanceled;
      default:
        return false;
    }
  }

  /**
   * Generate SMS message based on event type
   */
  private generateMessage(eventType: SmsEventType, data: SmsNotificationData): string {
    const formattedDate = this.formatDateTime(data.appointmentDate);
    const orgName = data.organizationName || 'Our clinic';

    switch (eventType) {
      case SmsEventType.APPOINTMENT_CREATED:
        let msg = `Hi ${data.clientName}, your ${data.serviceName} appointment is confirmed for ${formattedDate}.`;
        if (data.providerName) {
          msg += ` Provider: ${data.providerName}.`;
        }
        if (data.confirmationLink) {
          msg += ` Confirm: ${data.confirmationLink}`;
        }
        msg += ` - ${orgName}`;
        return msg;

      case SmsEventType.REMINDER_24H:
        return `Hi ${data.clientName}, reminder: your ${data.serviceName} appointment is tomorrow (${formattedDate}).${data.providerName ? ` Provider: ${data.providerName}.` : ''} - ${orgName}`;

      case SmsEventType.REMINDER_1H:
        return `Hi ${data.clientName}, your ${data.serviceName} appointment starts in 1 hour (${formattedDate}).${data.providerName ? ` Provider: ${data.providerName}.` : ''} See you soon! - ${orgName}`;

      case SmsEventType.APPOINTMENT_CANCELED:
        return `Hi ${data.clientName}, your ${data.serviceName} appointment on ${formattedDate} has been cancelled.${data.cancellationReason ? ` Reason: ${data.cancellationReason}` : ''} Please rebook if needed. - ${orgName}`;

      default:
        return '';
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendSms(
    organizationId: string,
    to: string,
    body: string,
  ): Promise<SmsSendResult> {
    try {
      // Get organization SMS settings
      const settings = await this.smsSettingsRepository.findOne({
        where: { organizationId },
      });

      if (!settings?.authToken || !settings?.accountSid || !settings?.fromPhoneNumber) {
        this.logger.warn(`SMS not configured for organization ${organizationId}`);
        return {
          success: false,
          error: 'SMS not configured for this organization',
        };
      }

      // Decrypt auth token
      const authToken = this.decrypt(settings.authToken);
      const accountSid = settings.accountSid;
      const fromNumber = settings.fromPhoneNumber;

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(to);

      this.logger.debug(`Sending SMS to ${formattedPhone}`);

      // Use Twilio API via fetch
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const params = new URLSearchParams();
      params.append('To', formattedPhone);
      params.append('From', fromNumber);
      params.append('Body', body);

      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const responseData = await response.json();

      if (!response.ok) {
        this.logger.error('Twilio API error', {
          status: response.status,
          error: responseData,
        });
        return {
          success: false,
          error: responseData?.message || 'Unknown error from Twilio API',
        };
      }

      this.logger.log(`SMS sent successfully to ${formattedPhone}`, {
        messageId: responseData.sid,
      });

      return {
        success: true,
        messageId: responseData.sid,
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
      // Check if we should send this notification
      const shouldSend = await this.shouldSendNotification(data.organizationId, eventType);
      if (!shouldSend) {
        this.logger.debug(`Skipping SMS notification for ${eventType} - disabled or not configured`);
        return {
          success: false,
          error: 'Notification type disabled or SMS not configured',
        };
      }

      // Generate message
      const message = this.generateMessage(eventType, data);

      // Send the message
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
    return this.sendAppointmentNotification(SmsEventType.APPOINTMENT_CREATED, data);
  }

  /**
   * Send 24-hour reminder notification
   */
  async sendReminder24hNotification(data: SmsNotificationData): Promise<SmsSendResult> {
    return this.sendAppointmentNotification(SmsEventType.REMINDER_24H, data);
  }

  /**
   * Send 1-hour reminder notification
   */
  async sendReminder1hNotification(data: SmsNotificationData): Promise<SmsSendResult> {
    return this.sendAppointmentNotification(SmsEventType.REMINDER_1H, data);
  }

  /**
   * Send appointment canceled notification
   */
  async sendAppointmentCanceledNotification(data: SmsNotificationData): Promise<SmsSendResult> {
    return this.sendAppointmentNotification(SmsEventType.APPOINTMENT_CANCELED, data);
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
