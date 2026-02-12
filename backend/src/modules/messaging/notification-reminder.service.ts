import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { NotificationService, NotificationEventType, NotificationData } from './notification.service';

/**
 * Service responsible for scheduling and sending reminder notifications across all channels.
 * 
 * This service runs scheduled tasks to:
 * - Send 24-hour reminders for upcoming appointments
 * - Send 1-hour reminders for upcoming appointments
 * 
 * It tracks sent reminders using the reminderSentAt field on appointments
 * to avoid sending duplicate notifications.
 * 
 * Notifications are sent to all configured channels (Email, SMS, WhatsApp)
 * based on organization settings.
 */
@Injectable()
export class NotificationReminderService {
  private readonly logger = new Logger(NotificationReminderService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Run every 10 minutes to check for appointments needing 24h reminders
   * Sends reminders for appointments starting in 23-25 hours
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async processReminders24h(): Promise<void> {
    this.logger.debug('Processing 24h reminders...');
    
    // Get appointments starting in approximately 24 hours (23-25 hour window)
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    await this.sendReminders(windowStart, windowEnd, NotificationEventType.APPOINTMENT_REMINDER, '24h');
  }

  /**
   * Run every 5 minutes to check for appointments needing 1h reminders
   * Sends reminders for appointments starting in 55-65 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processReminders1h(): Promise<void> {
    this.logger.debug('Processing 1h reminders...');

    // Get appointments starting in approximately 1 hour (55-65 minute window)
    const now = new Date();
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

    await this.sendReminders(windowStart, windowEnd, NotificationEventType.APPOINTMENT_REMINDER, '1h');
  }

  /**
   * Generic reminder sending logic
   */
  private async sendReminders(
    windowStart: Date,
    windowEnd: Date,
    eventType: NotificationEventType,
    reminderType: string,
  ): Promise<void> {
    try {
      // Get confirmed appointments in the time window
      // Only send reminders to CONFIRMED appointments (auto-confirmed by organization)
      // PENDING_CONFIRMATION appointments already received a confirmation request when created
      const appointments = await this.appointmentRepository.find({
        where: {
          startTime: Between(windowStart, windowEnd),
          status: AppointmentStatus.CONFIRMED,
        },
        relations: ['serviceOption', 'user'],
      });

      // Filter appointments that have phone OR email
      const appointmentsWithContact = appointments.filter(
        apt => apt.clientPhone || apt.clientEmail
      );

      if (appointmentsWithContact.length === 0) {
        this.logger.debug(`No appointments found for ${reminderType} reminders`);
        return;
      }

      this.logger.log(`Found ${appointmentsWithContact.length} appointments for ${reminderType} reminders`);

      for (const appointment of appointmentsWithContact) {
        // Get organization ID from user
        const organizationId = appointment.user?.organizationId;
        
        if (!organizationId) {
          this.logger.debug(`No organization ID for appointment ${appointment.id}`);
          continue;
        }

        // Check if any notification channel is configured
        const hasChannels = await this.notificationService.isAnyChannelReady(organizationId);
        if (!hasChannels) {
          this.logger.debug(`No notification channels configured for organization ${organizationId}`);
          continue;
        }

        // For 24h reminders, check if we haven't already sent one
        // We use a simple heuristic: if reminderSentAt is recent (within last 23 hours), skip
        if (reminderType === '24h' && appointment.reminderSentAt) {
          const hoursSinceReminder = (Date.now() - appointment.reminderSentAt.getTime()) / (60 * 60 * 1000);
          if (hoursSinceReminder < 23) {
            this.logger.debug(`24h reminder already sent for appointment ${appointment.id}`);
            continue;
          }
        }

        // For 1h reminders, we should have sent 24h reminder first
        // If reminderSentAt is null or too old (more than 26 hours), still send 1h reminder
        if (reminderType === '1h') {
          if (!appointment.reminderSentAt) {
            // No 24h reminder was sent - still send 1h reminder but log it
            this.logger.debug(`No 24h reminder was sent for appointment ${appointment.id}, sending 1h reminder anyway`);
          } else {
            const hoursSinceReminder = (Date.now() - appointment.reminderSentAt.getTime()) / (60 * 60 * 1000);
            // If reminder was sent less than 2 hours ago, it's likely a duplicate 1h reminder
            if (hoursSinceReminder < 2) {
              this.logger.debug(`1h reminder already sent for appointment ${appointment.id}`);
              continue;
            }
          }
        }

        // Build notification data
        const notificationData: NotificationData = {
          organizationId,
          clientName: appointment.clientName,
          clientPhone: appointment.clientPhone || undefined,
          clientEmail: appointment.clientEmail || undefined,
          serviceName: appointment.serviceOption?.title || 'Appointment',
          appointmentDate: appointment.startTime,
          providerName: appointment.user?.firstName
            ? `${appointment.user.firstName} ${appointment.user.lastName || ''}`.trim()
            : undefined,
        };

        // Send notification to all channels
        const result = await this.notificationService.sendNotification(eventType, notificationData);

        if (result.anySent) {
          this.logger.log(`${reminderType} reminder sent for appointment ${appointment.id}`, {
            email: result.email?.success,
            sms: result.sms?.success,
            whatsapp: result.whatsapp?.success,
          });
          
          // Update reminderSentAt
          await this.appointmentRepository.update(appointment.id, {
            reminderSentAt: new Date(),
          });
        } else {
          this.logger.debug(`No ${reminderType} reminder sent for appointment ${appointment.id} - all channels failed or disabled`, {
            email: result.email?.error,
            sms: result.sms?.error,
            whatsapp: result.whatsapp?.error,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error processing ${reminderType} reminders`, error);
    }
  }

  /**
   * Manual trigger for sending reminders (useful for testing or manual triggering)
   */
  async triggerReminders(type: '24h' | '1h'): Promise<{ processed: number; sent: number }> {
    const now = new Date();
    let windowStart: Date;
    let windowEnd: Date;
    let eventType: NotificationEventType;

    if (type === '24h') {
      windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
      windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      eventType = NotificationEventType.APPOINTMENT_REMINDER;
    } else {
      windowStart = new Date(now.getTime() + 55 * 60 * 1000);
      windowEnd = new Date(now.getTime() + 65 * 60 * 1000);
      eventType = NotificationEventType.APPOINTMENT_REMINDER;
    }

    await this.sendReminders(windowStart, windowEnd, eventType, type);

    // Return stats (simplified - in production you'd track actual counts)
    return { processed: 0, sent: 0 };
  }
}
