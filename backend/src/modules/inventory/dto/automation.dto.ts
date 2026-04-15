import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AutomationNodeType } from '../entities/automation-node.entity';

// ==================== Node Position ====================

export class NodePositionDto {
  @ApiProperty({ description: 'X coordinate on canvas' })
  @IsNumber()
  x: number;

  @ApiProperty({ description: 'Y coordinate on canvas' })
  @IsNumber()
  y: number;
}

// ==================== Automation Node DTOs ====================

export class CreateAutomationNodeDto {
  @ApiProperty({ enum: AutomationNodeType, description: 'Type of the automation node' })
  @IsEnum(AutomationNodeType)
  type: AutomationNodeType;

  @ApiPropertyOptional({ description: 'Display label for the node' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ description: 'Node configuration based on type' })
  @IsObject()
  config: Record<string, unknown>;

  @ApiProperty({ type: NodePositionDto, description: 'Visual position on canvas' })
  @ValidateNested()
  @Type(() => NodePositionDto)
  position: NodePositionDto;

  @ApiPropertyOptional({ description: 'IDs of nodes this connects to', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  nextNodeIds?: string[];
}

export class UpdateAutomationNodeDto {
  @ApiPropertyOptional({ enum: AutomationNodeType, description: 'Type of the automation node' })
  @IsOptional()
  @IsEnum(AutomationNodeType)
  type?: AutomationNodeType;

  @ApiPropertyOptional({ description: 'Display label for the node' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Node configuration based on type' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ type: NodePositionDto, description: 'Visual position on canvas' })
  @IsOptional()
  @ValidateNested()
  @Type(() => NodePositionDto)
  position?: NodePositionDto;

  @ApiPropertyOptional({ description: 'IDs of nodes this connects to', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  nextNodeIds?: string[];
}

// ==================== Automation Workflow DTOs ====================

export class CreateAutomationWorkflowDto {
  @ApiProperty({ description: 'Name of the automation workflow' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the workflow' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the workflow is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Initial nodes for the workflow', type: [CreateAutomationNodeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAutomationNodeDto)
  nodes?: CreateAutomationNodeDto[];
}

export class UpdateAutomationWorkflowDto {
  @ApiPropertyOptional({ description: 'Name of the automation workflow' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the workflow' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the workflow is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== Save Workflow Canvas DTO ====================

export class SaveWorkflowCanvasDto {
  @ApiPropertyOptional({ description: 'Name of the workflow' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Description of the workflow' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'All nodes in the workflow', type: [CreateAutomationNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAutomationNodeDto)
  nodes: CreateAutomationNodeDto[];
}

// ==================== Trigger Workflow DTO ====================

export class TriggerWorkflowDto {
  @ApiPropertyOptional({ description: 'Trigger context data' })
  @IsOptional()
  @IsObject()
  triggerData?: {
    inventoryItemId?: string;
    inventoryItemName?: string;
    currentStock?: number;
    minStockAlert?: number;
    adjustmentType?: string;
    adjustmentQuantity?: number;
  };
}
