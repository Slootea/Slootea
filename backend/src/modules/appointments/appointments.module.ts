import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { ServiceOptionsModule } from '../service-options/service-options.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BlockedTimesModule } from '../blocked-times/blocked-times.module';
import { SettingsModule } from '../settings/settings.module';
import { BookingLinksModule } from '../booking-links/booking-links.module';
import { ClientsModule } from '../clients/clients.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    forwardRef(() => ServiceOptionsModule),
    AvailabilityModule,
    BlockedTimesModule,
    SettingsModule,
    BookingLinksModule,
    forwardRef(() => ClientsModule),
    forwardRef(() => GamificationModule),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
