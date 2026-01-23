import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../entities/appointment.entity';
import { Type, Transform } from 'class-transformer';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Start time in ISO format' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ description: 'End time in ISO format (optional, calculated from service duration if not provided)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: 'Service option ID' })
  @IsUUID()
  serviceOptionId: string;

  @ApiProperty({ description: 'Client name' })
  @IsString()
  clientName: string;

  @ApiProperty({ description: 'Client email' })
  @IsEmail()
  clientEmail: string;

  @ApiPropertyOptional({ description: 'Client phone' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ description: 'Booking link ID' })
  @IsOptional()
  @IsUUID()
  bookingLinkId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetAvailableSlotsDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Service option ID' })
  @IsUUID()
  serviceOptionId: string;

  @ApiProperty({ description: 'Booking link ID' })
  @IsUUID()
  bookingLinkId: string;
}

export class AppointmentQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Search by client name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by start date (ISO format)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (ISO format)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by service option ID' })
  @IsOptional()
  @IsUUID()
  serviceOptionId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID (for organization admins)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Sort field', default: 'startTime' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'startTime';

  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase())
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export interface PaginatedResult<T> {
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
