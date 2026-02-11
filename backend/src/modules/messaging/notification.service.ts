import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService, AppointmentNotificationData as WhatsAppNotificationData } from './whatsapp.service';
import { SmsService, SmsNotificationData } from './sms.service';
import { EmailService, EmailNotificationData } from './email.service';
import { WhatsAppEventType } from '../notification-settings/entities/organization-whatsapp-template.entity';

/**
 * Notification event types (unified across all channels)
 */
export enum NotificationEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  REMINDER_24H = 'REMINDER_24H',
  REMINDER_1H = 'REMINDER_1H',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
}

/**
 * Unified notification data that works across all channels
 */
export interface NotificationData {
  organizationId: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceName: string;
  appointmentDate: Date;
  providerName?: string;
  organizationName?: string;
  confirmationLink?: string;
  appointmentLink?: string;
  cancellationReason?: string;
}

/**
 * Result of sending a notification to a single channel
 */
export interface ChannelResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Result of sending notifications across all channels
 */
export interface NotificationResult {
  email?: ChannelResult;
  sms?: ChannelResult;
  whatsapp?: ChannelResult;
  anySent: boolean;
  allFailed: boolean;
}

/**
 * Unified Notification Service
 * 
 * This service orchestrates sending notifications across all configured channels:
 * - Email (via SMTP, SendGrid, or Resend)
 * - SMS (via Twilio)
 * - WhatsApp (via Meta Cloud API)
 * 
 * It checks if each channel is configured and enabled for the organization
 * before attempting to send. Notifications are sent in parallel for efficiency.
 * 
 * Usage:
 * ```typescript
 * const result = await notificationService.sendAppointmentCreatedNotification({
 *   organizationId: 'org_123',
 *   clientName: 'John Doe',
 *   clientPhone: '+1234567890',
 *   clientEmail: 'john@example.com',
 *   serviceName: 'Consultation',
 *   appointmentDate: new Date(),
 * });
 * ```
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Map NotificationEventType to WhatsAppEventType
   */
  private mapToWhatsAppEventType(eventType: NotificationEventType): WhatsAppEventType {
    switch (eventType) {
      case NotificationEventType.APPOINTMENT_CREATED:
        return WhatsAppEventType.APPOINTMENT_CREATED;
      case NotificationEventType.REMINDER_24H:
        return WhatsAppEventType.REMINDER_24H;
      case NotificationEventType.REMINDER_1H:
        return WhatsAppEventType.REMINDER_1H;
      case NotificationEventType.APPOINTMENT_CANCELED:
        return WhatsAppEventType.APPOINTMENT_CANCELED;
      case NotificationEventType.APPOINTMENT_RESCHEDULED:
        return WhatsAppEventType.APPOINTMENT_RESCHEDULED;
    }
  }

  /**
   * Convert unified notification data to WhatsApp format
   */
  private toWhatsAppData(data: NotificationData): WhatsAppNotificationData | null {
    if (!data.clientPhone) {
      return null;
    }

    return {
      organizationId: data.organizationId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      serviceName: data.serviceName,
      appointmentDate: data.appointmentDate,
      providerName: data.providerName,
      organizationName: data.organizationName,
      confirmationLink: data.confirmationLink,
      cancellationReason: data.cancellationReason,
    };
  }

  /**
   * Convert unified notification data to SMS format
   */
  private toSmsData(data: NotificationData): SmsNotificationData | null {
    if (!data.clientPhone) {
      return null;
    }

    return {
      organizationId: data.organizationId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      serviceName: data.serviceName,
      appointmentDate: data.appointmentDate,
      providerName: data.providerName,
      organizationName: data.organizationName,
      confirmationLink: data.confirmationLink,
      cancellationReason: data.cancellationReason,
    };
  }

  /**
   * Convert unified notification data to Email format
   */
  private toEmailData(data: NotificationData): EmailNotificationData | null {
    if (!data.clientEmail) {
      return null;
    }

    return {
      organizationId: data.organizationId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      serviceName: data.serviceName,
      appointmentDate: data.appointmentDate,
      providerName: data.providerName,
      organizationName: data.organizationName,
      confirmationLink: data.confirmationLink,
      appointmentLink: data.appointmentLink,
      cancellationReason: data.cancellationReason,
    };
  }

  /**
   * Send notification across all configured channels
   * 
   * @param eventType - The type of event (created, reminder, canceled)
   * @param data - The notification data
   * @returns Results from each channel
   */
  async sendNotification(
    eventType: NotificationEventType,
    data: NotificationData,
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      anySent: false,
      allFailed: true,
    };

    const promises: Promise<void>[] = [];

    // Send WhatsApp notification
    const whatsappData = this.toWhatsAppData(data);
    if (whatsappData) {
      promises.push(
        this.sendWhatsAppNotification(eventType, whatsappData)
          .then((r) => {
            result.whatsapp = r;
            if (r.success) {
              result.anySent = true;
              result.allFailed = false;
            }
          })
          .catch((error) => {
            result.whatsapp = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          })
      );
    }

    // Send SMS notification
    const smsData = this.toSmsData(data);
    if (smsData) {
      this.logger.debug(`Sending SMS notification to ${smsData.clientPhone} for event ${eventType}`);
      promises.push(
        this.sendSmsNotification(eventType, smsData)
          .then((r) => {
            result.sms = r;
            if (r.success) {
              result.anySent = true;
              result.allFailed = false;
            }
          })
          .catch((error) => {
            result.sms = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          })
      );
    }

    // Send Email notification
    const emailData = this.toEmailData(data);
    if (emailData) {
      promises.push(
        this.sendEmailNotification(eventType, emailData)
          .then((r) => {
            result.email = r;
            if (r.success) {
              result.anySent = true;
              result.allFailed = false;
            }
          })
          .catch((error) => {
            result.email = {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          })
      );
    }

    // Wait for all notifications to complete
    await Promise.all(promises);

    // Log summary
    const channels = [
      result.email?.success && 'Email',
      result.sms?.success && 'SMS',
      result.whatsapp?.success && 'WhatsApp',
    ].filter(Boolean);

    if (channels.length > 0) {
      this.logger.log(`Notification sent via: ${channels.join(', ')} for event ${eventType}`);
    } else {
      this.logger.debug(`No notifications sent for event ${eventType} - channels not configured or disabled`);
    }

    return result;
  }

  /**
   * Send WhatsApp notification based on event type
   */
  private async sendWhatsAppNotification(
    eventType: NotificationEventType,
    data: WhatsAppNotificationData,
  ): Promise<ChannelResult> {
    try {
      const whatsappEventType = this.mapToWhatsAppEventType(eventType);

      switch (eventType) {
        case NotificationEventType.APPOINTMENT_CREATED:
          return this.whatsAppService.sendAppointmentCreatedNotification(data);
        case NotificationEventType.REMINDER_24H:
          return this.whatsAppService.sendReminder24hNotification(data);
        case NotificationEventType.REMINDER_1H:
          return this.whatsAppService.sendReminder1hNotification(data);
        case NotificationEventType.APPOINTMENT_CANCELED:
          return this.whatsAppService.sendAppointmentCanceledNotification(data);
        case NotificationEventType.APPOINTMENT_RESCHEDULED:
          return this.whatsAppService.sendAppointmentRescheduledNotification(data);
        default:
          return { success: false, error: 'Unknown event type' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS notification based on event type
   */
  private async sendSmsNotification(
    eventType: NotificationEventType,
    data: SmsNotificationData,
  ): Promise<ChannelResult> {
    try {
      this.logger.debug(`Sending SMS notification to ${data.clientPhone} for event ${eventType}`);
      switch (eventType) {
        case NotificationEventType.APPOINTMENT_CREATED:
          return this.smsService.sendAppointmentCreatedNotification(data);
        case NotificationEventType.REMINDER_24H:
          return this.smsService.sendReminder24hNotification(data);
        case NotificationEventType.REMINDER_1H:
          return this.smsService.sendReminder1hNotification(data);
        case NotificationEventType.APPOINTMENT_CANCELED:
          return this.smsService.sendAppointmentCanceledNotification(data);
        case NotificationEventType.APPOINTMENT_RESCHEDULED:
          return this.smsService.sendAppointmentRescheduledNotification(data);
        default:
          return { success: false, error: 'Unknown event type' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send Email notification based on event type
   */
  private async sendEmailNotification(
    eventType: NotificationEventType,
    data: EmailNotificationData,
  ): Promise<ChannelResult> {
    try {
      switch (eventType) {
        case NotificationEventType.APPOINTMENT_CREATED:
          return this.emailService.sendAppointmentCreatedNotification(data);
        case NotificationEventType.REMINDER_24H:
          return this.emailService.sendReminder24hNotification(data);
        case NotificationEventType.REMINDER_1H:
          return this.emailService.sendReminder1hNotification(data);
        case NotificationEventType.APPOINTMENT_CANCELED:
          return this.emailService.sendAppointmentCanceledNotification(data);
        case NotificationEventType.APPOINTMENT_RESCHEDULED:
          return this.emailService.sendAppointmentRescheduledNotification(data);
        default:
          return { success: false, error: 'Unknown event type' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===================== Convenience Methods =====================

  /**
   * Send appointment created notification
   */
  async sendAppointmentCreatedNotification(data: NotificationData): Promise<NotificationResult> {
   this.logger.debug(`Sending appointment created notification for organization ${data.organizationId} to client ${data.clientName} (${data.clientPhone}, ${data.clientEmail}) for service ${data.serviceName} on ${data.appointmentDate}`);
    return this.sendNotification(NotificationEventType.APPOINTMENT_CREATED, data);
  }

  /**
   * Send 24-hour reminder notification
   */
  async sendReminder24hNotification(data: NotificationData): Promise<NotificationResult> {
    return this.sendNotification(NotificationEventType.REMINDER_24H, data);
  }

  /**
   * Send 1-hour reminder notification
   */
  async sendReminder1hNotification(data: NotificationData): Promise<NotificationResult> {
    return this.sendNotification(NotificationEventType.REMINDER_1H, data);
  }

  /**
   * Send appointment canceled notification
   */
  async sendAppointmentCanceledNotification(data: NotificationData): Promise<NotificationResult> {
    return this.sendNotification(NotificationEventType.APPOINTMENT_CANCELED, data);
  }

  /**
   * Send appointment rescheduled notification
   */
  async sendAppointmentRescheduledNotification(data: NotificationData): Promise<NotificationResult> {
    return this.sendNotification(NotificationEventType.APPOINTMENT_RESCHEDULED, data);
  }

  // ===================== Channel Status Checks =====================

  /**
   * Check if any notification channel is configured for an organization
   */
  async isAnyChannelReady(organizationId: string): Promise<boolean> {
    const [whatsapp, sms, email] = await Promise.all([
      this.whatsAppService.isWhatsAppReady(organizationId),
      this.smsService.isSmsReady(organizationId),
      this.emailService.isEmailReady(organizationId),
    ]);

    return whatsapp || sms || email;
  }

  /**
   * Get status of all notification channels for an organization
   */
  async getChannelStatus(organizationId: string): Promise<{
    whatsapp: boolean;
    sms: boolean;
    email: boolean;
  }> {
    const [whatsapp, sms, email] = await Promise.all([
      this.whatsAppService.isWhatsAppReady(organizationId),
      this.smsService.isSmsReady(organizationId),
      this.emailService.isEmailReady(organizationId),
    ]);

    return { whatsapp, sms, email };
  }
}
