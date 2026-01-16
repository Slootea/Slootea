import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlockedTimeDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format', example: '2026-01-20' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Start time in HH:mm format (not required if full day)' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time in HH:mm format (not required if full day)' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Block the entire day' })
  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @ApiPropertyOptional({ description: 'Reason for blocking (optional)' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateBlockedTimeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

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
  isFullDay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
