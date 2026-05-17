import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Matches,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateServiceRecordDto {
  @ApiProperty({ description: 'Client UUID' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Service option UUID' })
  @IsUUID()
  serviceOptionId: string;

  @ApiProperty({ description: 'Service date in YYYY-MM-DD format (organization-local)' })
  @IsString()
  @Matches(ISO_DATE_REGEX, { message: 'serviceDate must be in YYYY-MM-DD format' })
  serviceDate: string;

  @ApiPropertyOptional({ description: 'Free-form note about the service' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateServiceRecordDto extends PartialType(
  OmitType(CreateServiceRecordDto, ['clientId'] as const),
) {}

export class ServiceRecordQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'From date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_REGEX)
  from?: string;

  @ApiPropertyOptional({ description: 'To date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_REGEX)
  to?: string;

  @ApiPropertyOptional({ default: 'serviceDate' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

// ---- Sync (bulk transactional) DTO ----

export class SyncCreateItemDto {
  @ApiProperty()
  @IsUUID()
  serviceOptionId: string;

  @ApiProperty()
  @IsString()
  @Matches(ISO_DATE_REGEX)
  serviceDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SyncUpdateItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceOptionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_REGEX)
  serviceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SyncServiceRecordsDto {
  @ApiProperty({ description: 'Client UUID — all operations apply to this client' })
  @IsUUID()
  clientId: string;

  @ApiPropertyOptional({ type: [SyncCreateItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SyncCreateItemDto)
  create?: SyncCreateItemDto[];

  @ApiPropertyOptional({ type: [SyncUpdateItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SyncUpdateItemDto)
  update?: SyncUpdateItemDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  deleteIds?: string[];
}

export class PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
