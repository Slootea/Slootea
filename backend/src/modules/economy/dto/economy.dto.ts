import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransactionType, PaymentMethod } from '../entities/transaction.entity';

// ==================== Transaction DTOs ====================

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType, description: 'Transaction type: income or expense' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ description: 'Transaction amount', minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code', default: 'TRY' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Transaction description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Transaction date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Invoice or receipt number' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Contact/vendor/client name' })
  @IsOptional()
  @IsString()
  contactName?: string;
}

export class UpdateTransactionDto {
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Transaction amount', minimum: 0.01 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Transaction description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Transaction date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Invoice or receipt number' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Contact/vendor/client name' })
  @IsOptional()
  @IsString()
  contactName?: string;
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({ description: 'Search in description, notes, contactName' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Sort field', default: 'date' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

// ==================== Category DTOs ====================

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: TransactionType, description: 'Category type: income or expense' })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({ description: 'Color hex code' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Icon name (lucide icon)' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Parent category ID for hierarchy' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Color hex code' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Icon name (lucide icon)' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: 'Whether the category is active' })
  @IsOptional()
  isActive?: boolean;
}

// ==================== Analytics DTOs ====================

export class AnalyticsQueryDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Group by: day, week, month', default: 'month' })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';
}

// ==================== Parasut DTOs ====================

export class ConnectParasutDto {
  @ApiProperty({ description: 'Parasut company ID' })
  @IsString()
  companyId: string;

  @ApiProperty({ description: 'Parasut username / email' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Parasut password' })
  @IsString()
  password: string;
}

// ==================== Response DTOs ====================

export class TransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: TransactionType }) type: TransactionType;
  @ApiProperty() amount: number;
  @ApiProperty() currency: string;
  @ApiProperty() description: string;
  @ApiProperty() date: string;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @ApiPropertyOptional() categoryId?: string;
  @ApiPropertyOptional() categoryName?: string;
  @ApiPropertyOptional() categoryColor?: string;
  @ApiProperty() source: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() referenceNumber?: string;
  @ApiPropertyOptional() contactName?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedTransactionResponseDto {
  @ApiProperty({ type: [TransactionResponseDto] }) items: TransactionResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}

export class AnalyticsSummaryDto {
  @ApiProperty() totalIncome: number;
  @ApiProperty() totalExpense: number;
  @ApiProperty() netProfit: number;
  @ApiProperty() transactionCount: number;
}

export class CategoryBreakdownDto {
  @ApiProperty() categoryId: string;
  @ApiProperty() categoryName: string;
  @ApiPropertyOptional() categoryColor?: string;
  @ApiProperty() total: number;
  @ApiProperty() count: number;
  @ApiProperty() percentage: number;
}

export class TrendDataDto {
  @ApiProperty() period: string;
  @ApiProperty() income: number;
  @ApiProperty() expense: number;
  @ApiProperty() net: number;
}

export class AnalyticsResponseDto {
  @ApiProperty() summary: AnalyticsSummaryDto;
  @ApiProperty({ type: [CategoryBreakdownDto] }) incomeByCategory: CategoryBreakdownDto[];
  @ApiProperty({ type: [CategoryBreakdownDto] }) expenseByCategory: CategoryBreakdownDto[];
  @ApiProperty({ type: [TrendDataDto] }) trends: TrendDataDto[];
}

export class ParasutStatusDto {
  @ApiProperty() connected: boolean;
  @ApiPropertyOptional() companyId?: string;
  @ApiPropertyOptional() syncStatus?: string;
  @ApiPropertyOptional() lastSyncAt?: Date;
  @ApiPropertyOptional() lastSyncError?: string;
  @ApiPropertyOptional() username?: string;
}
