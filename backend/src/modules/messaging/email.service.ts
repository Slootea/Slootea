import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import {
  OrganizationEmailSettings,
  EmailProvider,
} from '../notification-settings/entities/organization-email-settings.entity';
import {
  OrganizationNotificationParameters,
} from '../notification-settings/entities/organization-notification-parameters.entity';
import { MessageTemplateService, MessageTemplateData } from '../notification-settings/message-template.service';
import { MessageTemplateType } from '../notification-settings/entities/organization-message-template.entity';

/**
 * Email notification event types (aligned with WhatsApp events)
 */
export enum EmailEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  REMINDER_24H = 'REMINDER_24H',
  REMINDER_1H = 'REMINDER_1H',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
}

/**
 * Notification data for Email messages
 */
export interface EmailNotificationData {
  organizationId: string;
  clientName: string;
  clientEmail: string;
  serviceName: string;
  appointmentDate: Date;
  providerName?: string;
  organizationName?: string;
  confirmationLink?: string;
  appointmentLink?: string;
  cancellationReason?: string;
}

/**
 * Result of sending an email
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly encryptionKey: Buffer;
  private readonly encryptionAlgorithm = 'aes-256-gcm';

  constructor(
    @InjectRepository(OrganizationEmailSettings)
    private readonly emailSettingsRepository: Repository<OrganizationEmailSettings>,
    @InjectRepository(OrganizationNotificationParameters)
    private readonly notificationParamsRepository: Repository<OrganizationNotificationParameters>,
    private readonly configService: ConfigService,
    private readonly messageTemplateService: MessageTemplateService,
  ) {
    // Get encryption key from environment or generate a default for development
    const keyString = this.configService.get<string>('EMAIL_TOKEN_ENCRYPTION_KEY') ||
                      this.configService.get<string>('WHATSAPP_TOKEN_ENCRYPTION_KEY');
    if (keyString) {
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else {
      // Default key for development - MUST be replaced in production
      this.logger.warn('EMAIL_TOKEN_ENCRYPTION_KEY not set, using default key (NOT SAFE FOR PRODUCTION)');
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
   * Check if Email is ready to send messages for an organization
   */
  async isEmailReady(organizationId: string): Promise<boolean> {
    const settings = await this.emailSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings?.enabled || !settings?.fromEmail) {
      return false;
    }

    // Check provider-specific requirements
    switch (settings.provider) {
      case EmailProvider.SMTP:
        return !!(settings.smtpHost && settings.smtpPort && settings.smtpPassword);
      case EmailProvider.SENDGRID:
      case EmailProvider.RESEND:
        return !!settings.smtpPassword; // API key is stored in smtpPassword
      default:
        return false;
    }
  }

  /**
   * Check if a specific event type should trigger Email notification
   */
  async shouldSendNotification(
    organizationId: string,
    eventType: EmailEventType,
  ): Promise<boolean> {
    const [isReady, params] = await Promise.all([
      this.isEmailReady(organizationId),
      this.notificationParamsRepository.findOne({ where: { organizationId } }),
    ]);

    if (!isReady || !params) {
      return false;
    }

    switch (eventType) {
      case EmailEventType.APPOINTMENT_CREATED:
        return params.appointmentCreated;
      case EmailEventType.REMINDER_24H:
        return params.reminder24h;
      case EmailEventType.REMINDER_1H:
        return params.reminder1h;
      case EmailEventType.APPOINTMENT_CANCELED:
        return params.appointmentCanceled;
      case EmailEventType.APPOINTMENT_RESCHEDULED:
      case EmailEventType.APPOINTMENT_UPDATED:
        return params.appointmentRescheduled;
      default:
        return false;
    }
  }

  /**
   * Create nodemailer transporter based on provider settings
   */
  private async createTransporter(settings: OrganizationEmailSettings): Promise<nodemailer.Transporter> {
    const decryptedPassword = settings.smtpPassword ? this.decrypt(settings.smtpPassword) : '';

    switch (settings.provider) {
      case EmailProvider.SENDGRID:
        return nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: decryptedPassword,
          },
        });

      case EmailProvider.RESEND:
        return nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 587,
          secure: false,
          auth: {
            user: 'resend',
            pass: decryptedPassword,
          },
        });

      case EmailProvider.SMTP:
      default:
        return nodemailer.createTransport({
          host: settings.smtpHost!,
          port: settings.smtpPort!,
          secure: settings.smtpSecure,
          auth: settings.smtpUsername ? {
            user: settings.smtpUsername,
            pass: decryptedPassword,
          } : undefined,
        });
    }
  }

  /**
   * Send email via configured provider
   */
  async sendEmail(
    organizationId: string,
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<EmailSendResult> {
    try {
      // Get organization email settings
      const settings = await this.emailSettingsRepository.findOne({
        where: { organizationId },
      });

      if (!settings || !settings.fromEmail) {
        this.logger.warn(`Email not configured for organization ${organizationId}`);
        return {
          success: false,
          error: 'Email not configured for this organization',
        };
      }

      // Create transporter
      const transporter = await this.createTransporter(settings);

      this.logger.debug(`Sending email to ${to}`);

      // Send email
      const info = await transporter.sendMail({
        from: settings.fromName 
          ? `"${settings.fromName}" <${settings.fromEmail}>` 
          : settings.fromEmail,
        to,
        replyTo: settings.replyToEmail || undefined,
        subject,
        html,
        text,
      });

      this.logger.log(`Email sent successfully to ${to}`, {
        messageId: info.messageId,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send appointment notification via Email
   */
  async sendAppointmentNotification(
    eventType: EmailEventType,
    data: EmailNotificationData,
  ): Promise<EmailSendResult> {
    try {
      // Check if we should send this notification
      const shouldSend = await this.shouldSendNotification(data.organizationId, eventType);
      if (!shouldSend) {
        this.logger.debug(`Skipping Email notification for ${eventType} - disabled or not configured`);
        return {
          success: false,
          error: 'Notification type disabled or Email not configured',
        };
      }

      // Map event type to message template type
      const templateType = this.mapEventTypeToTemplateType(eventType);
      
      // Prepare template data
      const templateData: MessageTemplateData = {
        clientName: data.clientName,
        serviceName: data.serviceName,
        appointmentDate: this.formatDate(data.appointmentDate),
        appointmentTime: this.formatTime(data.appointmentDate),
        providerName: data.providerName,
        organizationName: data.organizationName,
        appointmentLink: data.appointmentLink || data.confirmationLink,
        confirmationLink: data.confirmationLink,
      };

      // Get rendered message from templates
      const renderedMessage = await this.messageTemplateService.getRenderedMessage(
        data.organizationId,
        templateType,
        templateData,
      );

      if (!renderedMessage) {
        this.logger.debug(`Template for ${eventType} is disabled`);
        return {
          success: false,
          error: 'Template is disabled',
        };
      }

      // Generate HTML from the text content
      const html = this.wrapInHtmlTemplate(renderedMessage.body, data.organizationName);
      const text = renderedMessage.body;

      // Send the email
      return this.sendEmail(data.organizationId, data.clientEmail, renderedMessage.subject, html, text);
    } catch (error) {
      this.logger.error(`Failed to send ${eventType} Email notification`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Map EmailEventType to MessageTemplateType
   */
  private mapEventTypeToTemplateType(eventType: EmailEventType): MessageTemplateType {
    switch (eventType) {
      case EmailEventType.APPOINTMENT_CREATED:
        return MessageTemplateType.APPOINTMENT_BOOKED;
      case EmailEventType.APPOINTMENT_UPDATED:
      case EmailEventType.APPOINTMENT_RESCHEDULED:
        return MessageTemplateType.APPOINTMENT_UPDATED;
      case EmailEventType.REMINDER_24H:
      case EmailEventType.REMINDER_1H:
        return MessageTemplateType.APPOINTMENT_REMINDER;
      case EmailEventType.APPOINTMENT_CANCELED:
        return MessageTemplateType.APPOINTMENT_CANCELED;
      default:
        return MessageTemplateType.APPOINTMENT_BOOKED;
    }
  }

  /**
   * Format date for template
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format time for template
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Wrap plain text in a simple HTML template
   */
  private wrapInHtmlTemplate(text: string, organizationName?: string): string {
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color: #007bff;">$1</a>');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
            ${escapedText}
          </div>
          ${organizationName ? `<p style="text-align: center; color: #888; margin-top: 20px; font-size: 12px;">${organizationName}</p>` : ''}
        </body>
      </html>
    `;
  }

  /**
   * Send appointment created notification
   */
  async sendAppointmentCreatedNotification(data: EmailNotificationData): Promise<EmailSendResult> {
    return this.sendAppointmentNotification(EmailEventType.APPOINTMENT_CREATED, data);
  }

  /**
   * Send appointment updated notification (when organization reschedules)
   */
  async sendAppointmentUpdatedNotification(data: EmailNotificationData): Promise<EmailSendResult> {
    return this.sendAppointmentNotification(EmailEventType.APPOINTMENT_UPDATED, data);
  }

  /**
   * Send 24-hour reminder notification
   */
  async sendReminder24hNotification(data: EmailNotificationData): Promise<EmailSendResult> {
    return this.sendAppointmentNotification(EmailEventType.REMINDER_24H, data);
  }

  /**
   * Send 1-hour reminder notification
   */
  async sendReminder1hNotification(data: EmailNotificationData): Promise<EmailSendResult> {
    return this.sendAppointmentNotification(EmailEventType.REMINDER_1H, data);
  }

  /**
   * Send appointment canceled notification
   */
  async sendAppointmentCanceledNotification(data: EmailNotificationData): Promise<EmailSendResult> {
    return this.sendAppointmentNotification(EmailEventType.APPOINTMENT_CANCELED, data);
  }

  /**
   * Send appointment rescheduled notification
   */
  async sendAppointmentRescheduledNotification(data: EmailNotificationData): Promise<EmailSendResult> {
    return this.sendAppointmentNotification(EmailEventType.APPOINTMENT_RESCHEDULED, data);
  }

  /**
   * Get organizations that have Email enabled
   */
  async getOrganizationsWithEmailEnabled(): Promise<string[]> {
    const settings = await this.emailSettingsRepository.find({
      where: { enabled: true },
      select: ['organizationId'],
    });
    return settings.map(s => s.organizationId);
  }
}
