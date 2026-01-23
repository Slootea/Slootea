import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessSettings } from './entities/business-settings.entity';
import { OrganizationSettings } from './entities/organization-settings.entity';
import { SettingsService } from './settings.service';
import { OrganizationSettingsService } from './organization-settings.service';
import { SettingsController } from './settings.controller';
import { OrganizationSettingsController } from './organization-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessSettings, OrganizationSettings]),
  ],
  controllers: [SettingsController, OrganizationSettingsController],
  providers: [SettingsService, OrganizationSettingsService],
  exports: [SettingsService, OrganizationSettingsService],
})
export class SettingsModule {}
