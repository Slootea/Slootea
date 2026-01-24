import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceOption } from './entities/service-option.entity';
import { UserServiceOption } from './entities/user-service-option.entity';
import { ServiceOptionsService } from './service-options.service';
import { UserServiceOptionsService } from './user-service-options.service';
import { ServiceOptionsController } from './service-options.controller';
import { UserServiceOptionsController } from './user-service-options.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOption, UserServiceOption]),
  ],
  controllers: [ServiceOptionsController, UserServiceOptionsController],
  providers: [ServiceOptionsService, UserServiceOptionsService],
  exports: [ServiceOptionsService, UserServiceOptionsService],
})
export class ServiceOptionsModule {}
