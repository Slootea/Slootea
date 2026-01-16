import { Module, forwardRef } from '@nestjs/common';
import { PublicController } from './public.controller';
import { BookingLinksModule } from '../booking-links/booking-links.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BlockedTimesModule } from '../blocked-times/blocked-times.module';
import { ServiceOptionsModule } from '../service-options/service-options.module';
import { SettingsModule } from '../settings/settings.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => BookingLinksModule),
    forwardRef(() => AppointmentsModule),
    forwardRef(() => AvailabilityModule),
    forwardRef(() => BlockedTimesModule),
    forwardRef(() => ServiceOptionsModule),
    forwardRef(() => SettingsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [PublicController],
})
export class PublicModule {}
