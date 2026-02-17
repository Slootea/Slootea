import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { NotificationService } from './notification.service';
import { NotificationReminderService } from './notification-reminder.service';
import {
  OrganizationWhatsAppSettings,
} from '../notification-settings/entities/organization-whatsapp-settings.entity';
import {
  OrganizationNotificationParameters,
} from '../notification-settings/entities/organization-notification-parameters.entity';
import { Appointment } from '../appointments/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationWhatsAppSettings,
      OrganizationNotificationParameters,
      Appointment,
    ]),
    ConfigModule,
  ],
  providers: [
    WhatsAppService,
    NotificationService,
    NotificationReminderService,
  ],
  exports: [WhatsAppService, NotificationService],
})
export class MessagingModule {}
