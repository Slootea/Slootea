import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppService, AppointmentNotificationData as WhatsAppNotificationData, WhatsAppEventType } from './whatsapp.service';
import { VerimorSmsService, SmsNotificationData, SmsEventType } from './verimor-sms.service';

/**
 * Notification event types (unified across all channels)
 */
export enum NotificationEventType {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
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
  campaignId?: number;
  error?: string;
}

/**
 * Result of sending notifications across all channels
 */
export interface NotificationResult {
  whatsapp?: ChannelResult;
  sms?: ChannelResult;
  anySent: boolean;
  allFailed: boolean;
}

/**
 * Unified Notification Service
 * 
 * This service orchestrates sending notifications via WhatsApp (Meta Cloud API) and SMS (Verimor API).
 * 
 * It checks if each channel is configured and enabled for the organization
 * before attempting to send.
 * 
 * Usage:
 * ```typescript
 * const result = await notificationService.sendAppointmentCreatedNotification({
 *   organizationId: 'org_123',
 *   clientName: 'John Doe',
 *   clientPhone: '+1234567890',
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
    private readonly smsService: VerimorSmsService,
  ) {}

  /**
   * Map NotificationEventType to WhatsAppEventType
   */
  private mapToWhatsAppEventType(eventType: NotificationEventType): WhatsAppEventType {
    switch (eventType) {
      case NotificationEventType.APPOINTMENT_CREATED:
        return WhatsAppEventType.APPOINTMENT_CREATED;
      case NotificationEventType.APPOINTMENT_REMINDER:
        return WhatsAppEventType.APPOINTMENT_REMINDER;
      case NotificationEventType.APPOINTMENT_CANCELED:
        return WhatsAppEventType.APPOINTMENT_CANCELED;
      case NotificationEventType.APPOINTMENT_RESCHEDULED:
        return WhatsAppEventType.APPOINTMENT_RESCHEDULED;
    }
  }

  /**
   * Map NotificationEventType to SmsEventType
   */
  private mapToSmsEventType(eventType: NotificationEventType): SmsEventType {
    switch (eventType) {
      case NotificationEventType.APPOINTMENT_CREATED:
        return SmsEventType.APPOINTMENT_CREATED;
      case NotificationEventType.APPOINTMENT_REMINDER:
        return SmsEventType.APPOINTMENT_REMINDER;
      case NotificationEventType.APPOINTMENT_CANCELED:
        return SmsEventType.APPOINTMENT_CANCELED;
      case NotificationEventType.APPOINTMENT_RESCHEDULED:
        return SmsEventType.APPOINTMENT_RESCHEDULED;
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
      appointmentLink: data.appointmentLink,
      cancellationReason: data.cancellationReason,
    };
  }

  /**
   * Send notification via all enabled channels (WhatsApp, SMS)
   * 
   * @param eventType - The type of event (created, reminder, canceled)
   * @param data - The notification data
   * @returns Results from all channels
   */
  async sendNotification(
    eventType: NotificationEventType,
    data: NotificationData,
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      anySent: false,
      allFailed: true,
    };

    // Send WhatsApp notification
    const whatsappData = this.toWhatsAppData(data);
    if (whatsappData) {
      try {
        const whatsappResult = await this.sendWhatsAppNotification(eventType, whatsappData);
        result.whatsapp = whatsappResult;
        if (whatsappResult.success) {
          result.anySent = true;
          result.allFailed = false;
        }
      } catch (error) {
        result.whatsapp = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Send SMS notification
    const smsData = this.toSmsData(data);
    if (smsData) {
      try {
        const smsResult = await this.sendSmsNotification(eventType, smsData);
        result.sms = smsResult;
        if (smsResult.success) {
          result.anySent = true;
          result.allFailed = false;
        }
      } catch (error) {
        result.sms = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Log summary
    const sentChannels = [];
    if (result.whatsapp?.success) sentChannels.push('WhatsApp');
    if (result.sms?.success) sentChannels.push('SMS');

    if (sentChannels.length > 0) {
      this.logger.log(`Notification sent via ${sentChannels.join(', ')} for event ${eventType}`);
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
      switch (eventType) {
        case NotificationEventType.APPOINTMENT_CREATED:
          return this.whatsAppService.sendAppointmentCreatedNotification(data);
        case NotificationEventType.APPOINTMENT_REMINDER:
          return this.whatsAppService.sendAppointmentReminderNotification(data);
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
      let result;
      switch (eventType) {
        case NotificationEventType.APPOINTMENT_CREATED:
          result = await this.smsService.sendAppointmentCreatedNotification(data);
          break;
        case NotificationEventType.APPOINTMENT_REMINDER:
          result = await this.smsService.sendAppointmentReminderNotification(data);
          break;
        case NotificationEventType.APPOINTMENT_CANCELED:
          result = await this.smsService.sendAppointmentCanceledNotification(data);
          break;
        case NotificationEventType.APPOINTMENT_RESCHEDULED:
          result = await this.smsService.sendAppointmentRescheduledNotification(data);
          break;
        default:
          return { success: false, error: 'Unknown event type' };
      }
      return {
        success: result.success,
        campaignId: result.campaignId,
        error: result.error,
      };
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
   this.logger.debug(`Sending appointment created notification for organization ${data.organizationId} to client ${data.clientName} (${data.clientPhone}) for service ${data.serviceName} on ${data.appointmentDate}`);
    return this.sendNotification(NotificationEventType.APPOINTMENT_CREATED, data);
  }

  /**
   * Send appointment reminder notification
   */
  async sendAppointmentReminderNotification(data: NotificationData): Promise<NotificationResult> {
    return this.sendNotification(NotificationEventType.APPOINTMENT_REMINDER, data);
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
    const [whatsapp, sms] = await Promise.all([
      this.whatsAppService.isWhatsAppReady(organizationId),
      this.smsService.isSmsReady(organizationId),
    ]);
    return whatsapp || sms;
  }

  /**
   * Get status of all notification channels for an organization
   */
  async getChannelStatus(organizationId: string): Promise<{
    whatsapp: boolean;
    sms: boolean;
  }> {
    const [whatsapp, sms] = await Promise.all([
      this.whatsAppService.isWhatsAppReady(organizationId),
      this.smsService.isSmsReady(organizationId),
    ]);
    return { whatsapp, sms };
  }
}
