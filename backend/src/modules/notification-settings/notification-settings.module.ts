import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettingsService } from './notification-settings.service';
import { WhatsAppBusinessTemplateService } from './whatsapp-business-template.service';
import { MetaOAuthController } from './meta-oauth.controller';
import { MetaOAuthService } from './meta-oauth.service';
import {
  OrganizationWhatsAppSettings,
  OrganizationNotificationParameters,
} from './entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationWhatsAppSettings,
      OrganizationNotificationParameters,
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
    WhatsAppBusinessTemplateService,
    MetaOAuthService,
  ],
  exports: [
    NotificationSettingsService,
    WhatsAppBusinessTemplateService,
    MetaOAuthService,
  ],
})
export class NotificationSettingsModule {}
