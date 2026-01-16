import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOption } from './entities/service-option.entity';
import { ServiceOptionsService } from './service-options.service';
import { ServiceOptionsController } from './service-options.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOption]),
  ],
  controllers: [ServiceOptionsController],
  providers: [ServiceOptionsService],
  exports: [ServiceOptionsService],
})
export class ServiceOptionsModule {}
