import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationSettings } from './entities/organization-settings.entity';
import { OrganizationSettingsService } from './organization-settings.service';
import { OrganizationSettingsController } from './organization-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationSettings]),
  ],
  controllers: [OrganizationSettingsController],
  providers: [OrganizationSettingsService],
  exports: [OrganizationSettingsService],
})
export class SettingsModule {}
