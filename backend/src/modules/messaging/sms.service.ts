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
import { MessageTemplateService, MessageTemplateData } from '../notification-settings/message-template.service';
import { MessageTemplateType } from '../notification-settings/entities/organization-message-template.entity';

/**
 * SMS notification event types (aligned with WhatsApp events)
 */
export enum SmsEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
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
    private readonly messageTemplateService: MessageTemplateService,
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

    // Check org-specific settings first
    if (settings?.enabled && settings?.accountSid && settings?.authToken && settings?.fromPhoneNumber) {
      return true;
    }

    // Fallback: check if env vars are configured (for development)
    const envAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const envAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const envMessagingServiceSid = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID') ||
                                   this.configService.get<string>('TWILIO_PHONE_NUMBER');
    
    return !!(envAccountSid && envAuthToken && envMessagingServiceSid);
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

    if (!isReady) {
      return false;
    }

    // If no params exist, default to sending all notifications (useful for development with env vars)
    if (!params) {
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
   * Map SMS event type to message template type
   */
  private mapEventToTemplateType(eventType: SmsEventType): MessageTemplateType {
    switch (eventType) {
      case SmsEventType.APPOINTMENT_CREATED:
        return MessageTemplateType.APPOINTMENT_BOOKED;
      case SmsEventType.APPOINTMENT_REMINDER:
        return MessageTemplateType.APPOINTMENT_REMINDER;
      case SmsEventType.APPOINTMENT_CANCELED:
        return MessageTemplateType.APPOINTMENT_CANCELED;
      case SmsEventType.APPOINTMENT_RESCHEDULED:
        return MessageTemplateType.APPOINTMENT_UPDATED;
      default:
        return MessageTemplateType.APPOINTMENT_BOOKED;
    }
  }

  /**
   * Generate SMS message based on event type using organization templates
   */
  private async generateMessage(eventType: SmsEventType, data: SmsNotificationData): Promise<string> {
    const templateType = this.mapEventToTemplateType(eventType);
    
    // Format date and time for template
    const formattedDate = data.appointmentDate.toLocaleDateString('en', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = data.appointmentDate.toLocaleTimeString('en', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const templateData: MessageTemplateData = {
      clientName: data.clientName,
      serviceName: data.serviceName,
      appointmentDate: formattedDate,
      appointmentTime: formattedTime,
      providerName: data.providerName,
      organizationName: data.organizationName || 'Our clinic',
      appointmentLink: data.confirmationLink,
      confirmationLink: data.confirmationLink,
    };

    try {
      const rendered = await this.messageTemplateService.getRenderedMessage(
        data.organizationId,
        templateType,
        templateData,
      );

      if (rendered?.body) {
        return rendered.body;
      }
    } catch (error) {
      this.logger.warn(`Failed to get message template, using fallback: ${error.message}`);
    }

    // Fallback to hardcoded message if template fails
    return this.generateFallbackMessage(eventType, data);
  }

  /**
   * Fallback message generation if template service fails
   */
  private generateFallbackMessage(eventType: SmsEventType, data: SmsNotificationData): string {
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

      case SmsEventType.APPOINTMENT_REMINDER:
        return `Hi ${data.clientName}, reminder: your ${data.serviceName} appointment is on ${formattedDate}.${data.providerName ? ` Provider: ${data.providerName}.` : ''} See you soon! - ${orgName}`;

      case SmsEventType.APPOINTMENT_CANCELED:
        return `Hi ${data.clientName}, your ${data.serviceName} appointment on ${formattedDate} has been cancelled.${data.cancellationReason ? ` Reason: ${data.cancellationReason}` : ''} Please rebook if needed. - ${orgName}`;

      case SmsEventType.APPOINTMENT_RESCHEDULED:
        let rescheduleMsg = `Hi ${data.clientName}, your ${data.serviceName} appointment has been rescheduled to ${formattedDate}.`;
        if (data.providerName) {
          rescheduleMsg += ` Provider: ${data.providerName}.`;
        }
        rescheduleMsg += ` - ${orgName}`;
        return rescheduleMsg;

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

      // Try to get credentials from org settings, fall back to env vars for development
      let accountSid: string | null = null;
      let authToken: string | null = null;
      let messagingServiceSid: string | null = null;

      if (settings?.authToken && settings?.accountSid && settings?.fromPhoneNumber) {
        // Use organization-specific settings
        accountSid = settings.accountSid;
        authToken = this.decrypt(settings.authToken);
        messagingServiceSid = settings.fromPhoneNumber; // Can store messaging service SID here
      } else {
        // Fallback to environment variables (for development)
        accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || null;
        authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || null;
        messagingServiceSid = this.configService.get<string>('TWILIO_MESSAGING_SERVICE_SID') || 
                              this.configService.get<string>('TWILIO_PHONE_NUMBER') || null;
        
        if (accountSid && authToken && messagingServiceSid) {
          this.logger.debug(`Using Twilio credentials from environment for organization ${organizationId}`);
        }
      }

      if (!authToken || !accountSid || !messagingServiceSid) {
        this.logger.warn(`SMS not configured for organization ${organizationId}`);
        return {
          success: false,
          error: 'SMS not configured for this organization',
        };
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(to);

      this.logger.debug(`Sending SMS to ${formattedPhone}`);

      // Use Twilio API via fetch
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      
      const params = new URLSearchParams();
      params.append('To', formattedPhone);
      // Use MessagingServiceSid if it starts with 'MG', otherwise use as From number
      if (messagingServiceSid.startsWith('MG')) {
        params.append('MessagingServiceSid', messagingServiceSid);
      } else {
        params.append('From', messagingServiceSid);
      }
      params.append('Body', body);

      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      this.logger.debug('Twilio SMS request', {
        url,
        to: formattedPhone,
        messagingServiceSid,
        bodyLength: body.length,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseData = await response.json();
      this.logger.debug('Twilio API response', {
        status: response.status,
        response: responseData,
      });
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

      // Generate message using organization templates
      const message = await this.generateMessage(eventType, data);

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
