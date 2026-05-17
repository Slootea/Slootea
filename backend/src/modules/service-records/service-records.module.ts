import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRecord } from './entities/service-record.entity';
import { Client } from '../clients/entities/client.entity';
import { ServiceOption } from '../service-options/entities/service-option.entity';
import { ServiceRecordsService } from './service-records.service';
import { ServiceRecordsController } from './service-records.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRecord, Client, ServiceOption])],
  controllers: [ServiceRecordsController],
  providers: [ServiceRecordsService],
  exports: [ServiceRecordsService],
})
export class ServiceRecordsModule {}
