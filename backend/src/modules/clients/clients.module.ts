import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientPenalty } from './entities/client-penalty.entity';
import { ClientsService } from './clients.service';
import { ClientPenaltyService } from './client-penalty.service';
import { ClientsController } from './clients.controller';
import { ClientPenaltyController } from './client-penalty.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ServiceRecordsModule } from '../service-records/service-records.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientPenalty]),
    forwardRef(() => AppointmentsModule),
    ServiceRecordsModule,
  ],
  controllers: [ClientsController, ClientPenaltyController],
  providers: [ClientsService, ClientPenaltyService],
  exports: [ClientsService, ClientPenaltyService],
})
export class ClientsModule {}
