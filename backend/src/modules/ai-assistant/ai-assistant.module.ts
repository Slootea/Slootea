import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { ServiceOption } from '../service-options/entities/service-option.entity';
import { OrganizationSettings } from '../settings/entities/organization-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOption, OrganizationSettings]),
  ],
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
