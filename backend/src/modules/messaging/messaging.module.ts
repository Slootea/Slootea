import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { VerimorSmsService } from './verimor-sms.service';
import { NotificationService } from './notification.service';
import { NotificationReminderService } from './notification-reminder.service';
import {
  OrganizationWhatsAppSettings,
} from '../notification-settings/entities/organization-whatsapp-settings.entity';
import {
  OrganizationNotificationParameters,
} from '../notification-settings/entities/organization-notification-parameters.entity';
import {
  OrganizationSmsSettings,
} from '../notification-settings/entities/organization-sms-settings.entity';
import {
  SmsTemplate,
} from '../notification-settings/entities/sms-template.entity';
import {
  OrganizationSettings,
} from '../settings/entities/organization-settings.entity';
import { Appointment } from '../appointments/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationWhatsAppSettings,
      OrganizationNotificationParameters,
      OrganizationSmsSettings,
      SmsTemplate,
      OrganizationSettings,
      Appointment,
    ]),
    ConfigModule,
  ],
  providers: [
    WhatsAppService,
    VerimorSmsService,
    NotificationService,
    NotificationReminderService,
  ],
  exports: [WhatsAppService, VerimorSmsService, NotificationService],
})
export class MessagingModule {}
