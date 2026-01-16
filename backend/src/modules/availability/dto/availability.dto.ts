import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../entities/availability.entity';

export class CreateAvailabilityDto {
  @ApiProperty({ enum: DayOfWeek, description: 'Day of the week (0=Monday, 6=Sunday)' })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ description: 'Start time in HH:mm format', example: '09:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({ description: 'End time in HH:mm format', example: '17:00' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;

  @ApiPropertyOptional({ description: 'Optional service option ID for specific availability' })
  @IsOptional()
  @IsUUID()
  serviceOptionId?: string;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceOptionId?: string;
}

export class BulkCreateAvailabilityDto {
  @ApiProperty({ type: [CreateAvailabilityDto] })
  availabilities: CreateAvailabilityDto[];
}
