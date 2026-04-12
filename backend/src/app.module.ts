import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ServiceOptionsModule } from './modules/service-options/service-options.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BlockedTimesModule } from './modules/blocked-times/blocked-times.module';
import { BookingLinksModule } from './modules/booking-links/booking-links.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { PublicModule } from './modules/public/public.module';
import { ClientsModule } from './modules/clients/clients.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationSettingsModule } from './modules/notification-settings/notification-settings.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { AdminModule } from './modules/admin/admin.module';
import { ExternalProvidersModule } from './modules/external-providers/external-providers.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'appointment_user'),
        password: configService.get('DATABASE_PASSWORD', 'appointment_pass'),
        database: configService.get('DATABASE_NAME', 'appointment_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('TYPEORM_SYNCHRONIZE') === 'true' || configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ServiceOptionsModule,
    AvailabilityModule,
    BlockedTimesModule,
    BookingLinksModule,
    AppointmentsModule,
    SettingsModule,
    MessagingModule,
    PublicModule,
    ClientsModule,
    ReportsModule,
    NotificationSettingsModule,
    AiAssistantModule,
    AdminModule,
    ExternalProvidersModule,
    MonitoringModule,
  ],
})
export class AppModule {}
