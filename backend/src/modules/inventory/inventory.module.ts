import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { ServiceInventoryUsage } from './entities/service-inventory-usage.entity';
import { StockAdjustment } from './entities/stock-adjustment.entity';
import { AutomationWorkflow } from './entities/automation-workflow.entity';
import { AutomationNode } from './entities/automation-node.entity';
import { AutomationExecution } from './entities/automation-execution.entity';
import { OrganizationSettings } from '../settings/entities/organization-settings.entity';
import { InventoryService } from './inventory.service';
import { AutomationService } from './automation.service';
import { InventoryController } from './inventory.controller';
import { AutomationController } from './automation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      ServiceInventoryUsage,
      StockAdjustment,
      AutomationWorkflow,
      AutomationNode,
      AutomationExecution,
      OrganizationSettings,
    ]),
  ],
  controllers: [InventoryController, AutomationController],
  providers: [InventoryService, AutomationService],
  exports: [InventoryService, AutomationService],
})
export class InventoryModule {}
