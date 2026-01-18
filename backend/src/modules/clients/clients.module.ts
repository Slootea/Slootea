import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client]),
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
