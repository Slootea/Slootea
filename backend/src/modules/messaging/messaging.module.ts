import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service';
import { WhatsAppService } from './whatsapp.service';
import { SmsService } from './sms.service';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { NotificationReminderService } from './notification-reminder.service';
import {
  OrganizationWhatsAppSettings,
} from '../notification-settings/entities/organization-whatsapp-settings.entity';
import {
  OrganizationNotificationParameters,
} from '../notification-settings/entities/organization-notification-parameters.entity';
import {
  OrganizationWhatsAppTemplate,
} from '../notification-settings/entities/organization-whatsapp-template.entity';
import {
  OrganizationSmsSettings,
} from '../notification-settings/entities/organization-sms-settings.entity';
import {
  OrganizationEmailSettings,
} from '../notification-settings/entities/organization-email-settings.entity';
import { Appointment } from '../appointments/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationWhatsAppSettings,
      OrganizationNotificationParameters,
      OrganizationWhatsAppTemplate,
      OrganizationSmsSettings,
      OrganizationEmailSettings,
      Appointment,
    ]),
    ConfigModule,
  ],
  providers: [
    MessagingService,
    WhatsAppService,
    SmsService,
    EmailService,
    NotificationService,
    NotificationReminderService,
  ],
  exports: [MessagingService, WhatsAppService, SmsService, EmailService, NotificationService],
})
export class MessagingModule {}
