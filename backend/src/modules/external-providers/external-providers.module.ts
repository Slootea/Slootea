import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalProvidersController } from './external-providers.controller';
import { ExternalProvidersService } from './external-providers.service';
import { ExternalProvider } from './entities/external-provider.entity';
import { ExternalProviderServiceOption } from './entities/external-provider-service-option.entity';
import { Availability } from '../availability/entities/availability.entity';
import { BlockedTime } from '../blocked-times/entities/blocked-time.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExternalProvider,
      ExternalProviderServiceOption,
      Availability,
      BlockedTime,
    ]),
    AuthModule,
  ],
  controllers: [ExternalProvidersController],
  providers: [ExternalProvidersService],
  exports: [ExternalProvidersService],
})
export class ExternalProvidersModule {}
