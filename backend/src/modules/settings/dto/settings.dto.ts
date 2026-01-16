import { IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional({ description: 'Hours before appointment when confirmation is required' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  confirmationRequiredHours?: number;

  @ApiPropertyOptional({ description: 'Hours before appointment - confirmation deadline' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(72)
  confirmationDeadlineHours?: number;

  @ApiPropertyOptional({ description: 'Auto-cancel if not confirmed before deadline' })
  @IsOptional()
  @IsBoolean()
  autoCancelUnconfirmed?: boolean;

  @ApiPropertyOptional({ description: 'Buffer time between appointments in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Maximum appointments per day' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxAppointmentsPerDay?: number;

  @ApiPropertyOptional({ description: 'Minimum hours in advance for booking' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  minAdvanceBookingHours?: number;

  @ApiPropertyOptional({ description: 'Maximum days in advance for booking' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxAdvanceBookingDays?: number;
}
