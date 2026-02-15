import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { User } from '../users/entities/user.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ServiceOption } from '../service-options/entities/service-option.entity';
import { UserServiceOption } from '../service-options/entities/user-service-option.entity';
import { OrganizationSettings } from '../settings/entities/organization-settings.entity';
import { BookingLink } from '../booking-links/entities/booking-link.entity';
import { Client } from '../clients/entities/client.entity';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';

@Module({
  imports: [
    NotificationSettingsModule,
    TypeOrmModule.forFeature([
      Organization,
      UserOrganization,
      User,
      Appointment,
      ServiceOption,
      UserServiceOption,
      OrganizationSettings,
      BookingLink,
      Client,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, SystemAdminGuard],
  exports: [AdminService, SystemAdminGuard],
})
export class AdminModule {}
