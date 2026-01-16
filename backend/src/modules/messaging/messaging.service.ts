import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendSmsOptions {
  to: string;
  body: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send SMS using Twilio (stub implementation)
   * Integration ready but not fully implemented
   */
  async sendSms(options: SendSmsOptions): Promise<boolean> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.warn(
        'Twilio credentials not configured. SMS not sent.',
      );
      return false;
    }

    try {
      // Twilio integration stub
      // Uncomment and configure when ready to use
      /*
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);
      
      await client.messages.create({
        body: options.body,
        from: fromNumber,
        to: options.to,
      });
      */

      this.logger.log(`SMS would be sent to ${options.to}: ${options.body}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send SMS', error);
      return false;
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(
    phone: string,
    clientName: string,
    appointmentTime: Date,
    confirmationLink: string,
  ): Promise<boolean> {
    const formattedTime = appointmentTime.toLocaleString();
    const body = `Hi ${clientName}, this is a reminder about your appointment on ${formattedTime}. Please confirm your attendance: ${confirmationLink}`;

    return this.sendSms({ to: phone, body });
  }

  /**
   * Send booking confirmation
   */
  async sendBookingConfirmation(
    phone: string,
    clientName: string,
    serviceName: string,
    appointmentTime: Date,
  ): Promise<boolean> {
    const formattedTime = appointmentTime.toLocaleString();
    const body = `Hi ${clientName}, your ${serviceName} appointment is confirmed for ${formattedTime}. We'll send you a reminder before your appointment.`;

    return this.sendSms({ to: phone, body });
  }

  /**
   * Send cancellation notification
   */
  async sendCancellationNotification(
    phone: string,
    clientName: string,
    appointmentTime: Date,
  ): Promise<boolean> {
    const formattedTime = appointmentTime.toLocaleString();
    const body = `Hi ${clientName}, your appointment on ${formattedTime} has been cancelled. Please rebook if needed.`;

    return this.sendSms({ to: phone, body });
  }
}
