import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettingsService } from './notification-settings.service';
import { SmsSettingsService } from './sms-settings.service';
import { SmsTemplateSeederService } from './sms-template-seeder.service';
import { WhatsAppBusinessTemplateService } from './whatsapp-business-template.service';
import { MetaOAuthController } from './meta-oauth.controller';
import { MetaOAuthService } from './meta-oauth.service';
import {
  OrganizationWhatsAppSettings,
  OrganizationNotificationParameters,
  OrganizationSmsSettings,
  SmsTemplate,
} from './entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationWhatsAppSettings,
      OrganizationNotificationParameters,
      OrganizationSmsSettings,
      SmsTemplate,
    ]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [
    NotificationSettingsController,
    MetaOAuthController,
  ],
  providers: [
    NotificationSettingsService,
    SmsSettingsService,
    SmsTemplateSeederService,
    WhatsAppBusinessTemplateService,
    MetaOAuthService,
  ],
  exports: [
    NotificationSettingsService,
    SmsSettingsService,
    WhatsAppBusinessTemplateService,
    MetaOAuthService,
  ],
})
export class NotificationSettingsModule {}
