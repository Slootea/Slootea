import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettingsService } from './notification-settings.service';
import { MessageTemplateController, OrganizationMessageTemplateController } from './message-template.controller';
import { MessageTemplateService } from './message-template.service';
import {
  OrganizationWhatsAppSettings,
  OrganizationNotificationParameters,
  OrganizationWhatsAppTemplate,
  OrganizationSmsSettings,
  OrganizationEmailSettings,
  OrganizationMessageTemplate,
} from './entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationWhatsAppSettings,
      OrganizationNotificationParameters,
      OrganizationWhatsAppTemplate,
      OrganizationSmsSettings,
      OrganizationEmailSettings,
      OrganizationMessageTemplate,
    ]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [NotificationSettingsController, MessageTemplateController, OrganizationMessageTemplateController],
  providers: [NotificationSettingsService, MessageTemplateService],
  exports: [NotificationSettingsService, MessageTemplateService],
})
export class NotificationSettingsModule {}
