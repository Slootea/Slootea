import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InventoryCategory } from '../entities/inventory-item.entity';
import { StockAdjustmentType } from '../entities/stock-adjustment.entity';

// ==================== Inventory Item DTOs ====================

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Name of the inventory item' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Stock Keeping Unit for tracking' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Description of the item' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: InventoryCategory, default: InventoryCategory.CONSUMABLE })
  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @ApiPropertyOptional({ description: 'Unit of measurement (ml, g, pcs, etc.)', default: 'pcs' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Current stock quantity', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentStock?: number;

  @ApiPropertyOptional({ description: 'Minimum stock level for low stock alert', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minStockAlert?: number;

  @ApiPropertyOptional({ description: 'Cost per unit for profitability tracking', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerUnit?: number;

  @ApiPropertyOptional({ description: 'Retail price for sellable items', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  retailPrice?: number;

  @ApiPropertyOptional({ description: 'Base64 encoded image data' })
  @IsOptional()
  @ValidateIf((o) => o.imageBase64 !== '' && o.imageBase64 !== null)
  @IsString()
  @Matches(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, {
    message: 'Image must be a valid base64 encoded image',
  })
  imageBase64?: string;

  @ApiPropertyOptional({ description: 'Whether the item is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ description: 'Name of the inventory item' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Stock Keeping Unit for tracking' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Description of the item' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: InventoryCategory })
  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Current stock quantity. Updating this creates a manual stock adjustment.', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentStock?: number;

  @ApiPropertyOptional({ description: 'Minimum stock level for low stock alert', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minStockAlert?: number;

  @ApiPropertyOptional({ description: 'Cost per unit', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPerUnit?: number;

  @ApiPropertyOptional({ description: 'Retail price', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  retailPrice?: number;

  @ApiPropertyOptional({ description: 'Base64 encoded image data' })
  @IsOptional()
  @ValidateIf((o) => o.imageBase64 !== '' && o.imageBase64 !== null)
  @IsString()
  @Matches(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, {
    message: 'Image must be a valid base64 encoded image',
  })
  imageBase64?: string;

  @ApiPropertyOptional({ description: 'Whether the item is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ==================== Stock Adjustment DTOs ====================

export class AdjustStockDto {
  @ApiProperty({ description: 'Quantity to adjust (positive for additions, negative for deductions)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  quantity: number;

  @ApiPropertyOptional({ enum: StockAdjustmentType, default: StockAdjustmentType.MANUAL })
  @IsOptional()
  @IsEnum(StockAdjustmentType)
  type?: StockAdjustmentType;

  @ApiPropertyOptional({ description: 'Reason for the adjustment' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ==================== Service Inventory Usage DTOs ====================

export class ServiceInventoryUsageDto {
  @ApiProperty({ description: 'Inventory item ID' })
  @IsUUID()
  inventoryItemId: string;

  @ApiProperty({ description: 'Quantity used per appointment', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantityUsed: number;
}

export class UpdateServiceInventoryUsageDto {
  @ApiProperty({ description: 'Array of inventory items used by the service', type: [ServiceInventoryUsageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceInventoryUsageDto)
  items: ServiceInventoryUsageDto[];
}

// ==================== Query DTOs ====================

export class InventoryQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by name or SKU' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: InventoryCategory })
  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Only show items with low stock' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  lowStock?: boolean;
}

// ==================== Response DTOs ====================

export class InventoryItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() sku?: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty({ enum: InventoryCategory }) category: InventoryCategory;
  @ApiProperty() unit: string;
  @ApiProperty() currentStock: number;
  @ApiProperty() minStockAlert: number;
  @ApiPropertyOptional() costPerUnit?: number;
  @ApiPropertyOptional() retailPrice?: number;
  @ApiPropertyOptional() imageBase64?: string;
  @ApiProperty() isActive: boolean;
  @ApiProperty() isLowStock: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedInventoryResponseDto {
  @ApiProperty({ type: [InventoryItemResponseDto] })
  items: InventoryItemResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class LowStockSummaryDto {
  @ApiProperty() totalLowStockItems: number;
  @ApiProperty({ type: [InventoryItemResponseDto] }) items: InventoryItemResponseDto[];
}

// ==================== Reports DTOs ====================

export class DailyUsageQueryDto {
  @ApiPropertyOptional({ description: 'Start date for the report (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for the report (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by specific inventory item ID' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;
}

export class DailyUsageItemDto {
  @ApiProperty() date: string;
  @ApiProperty() used: number;
  @ApiProperty() added: number;
  @ApiProperty() netChange: number;
}

export class ItemUsageDto {
  @ApiProperty() itemId: string;
  @ApiProperty() itemName: string;
  @ApiProperty() unit: string;
  @ApiProperty({ type: [DailyUsageItemDto] }) dailyData: DailyUsageItemDto[];
  @ApiProperty() totalUsed: number;
  @ApiProperty() totalAdded: number;
}

export class DailyUsageReportDto {
  @ApiProperty({ type: [ItemUsageDto] }) items: ItemUsageDto[];
  @ApiProperty() startDate: string;
  @ApiProperty() endDate: string;
}
