import { IsString, IsOptional, IsEmail, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ description: 'Client name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Client email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Client phone number (unique identifier)' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Notes about the client' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional({ description: 'Client name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Client email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Notes about the client' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ClientQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
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
