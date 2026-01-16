import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingLinkType } from '../entities/booking-link.entity';

export class CreateBookingLinkDto {
  @ApiPropertyOptional({ description: 'Name for the booking link' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ enum: BookingLinkType, description: 'Type of booking link' })
  @IsEnum(BookingLinkType)
  type: BookingLinkType;

  @ApiPropertyOptional({ description: 'Service option ID (required for specific_option type)' })
  @IsOptional()
  @IsUUID()
  serviceOptionId?: string;

  @ApiPropertyOptional({ description: 'Expiration date in ISO format' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateBookingLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
