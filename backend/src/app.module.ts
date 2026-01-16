import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ServiceOptionsModule,
    AvailabilityModule,
    BlockedTimesModule,
    BookingLinksModule,
    AppointmentsModule,
    SettingsModule,
    MessagingModule,
    PublicModule,
  ],
})
export class AppModule {}
