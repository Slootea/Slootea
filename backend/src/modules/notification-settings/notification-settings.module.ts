import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { NotificationSettingsController } from './notification-settings.controller';
import { NotificationSettingsService } from './notification-settings.service';
import {
  OrganizationWhatsAppSettings,
  OrganizationNotificationParameters,
  OrganizationWhatsAppTemplate,
} from './entities';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationWhatsAppSettings,
      OrganizationNotificationParameters,
      OrganizationWhatsAppTemplate,
    ]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [NotificationSettingsController],
  providers: [NotificationSettingsService],
  exports: [NotificationSettingsService],
})
export class NotificationSettingsModule {}
