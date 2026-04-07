import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsUUID,
  Min,
  Max,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExternalProviderDto {
  @ApiProperty({ description: 'Display name of the provider' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Base64 encoded image data (data:image/...;base64,...)' })
  @IsOptional()
  @ValidateIf((o) => o.imageBase64 !== '' && o.imageBase64 !== null)
  @IsString()
  @Matches(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, {
    message: 'Image must be a valid base64 encoded image (data:image/...;base64,...)',
  })
  imageBase64?: string;

  @ApiPropertyOptional({ description: 'Whether provider is available for bookings', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateExternalProviderDto {
  @ApiPropertyOptional({ description: 'Display name of the provider' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Base64 encoded image data (data:image/...;base64,...)' })
  @IsOptional()
  @ValidateIf((o) => o.imageBase64 !== '' && o.imageBase64 !== null)
  @IsString()
  @Matches(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, {
    message: 'Image must be a valid base64 encoded image (data:image/...;base64,...)',
  })
  imageBase64?: string;

  @ApiPropertyOptional({ description: 'Whether provider is available for bookings' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignServicesDto {
  @ApiProperty({ description: 'Array of service option IDs to assign', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  serviceOptionIds: string[];
}

export class CreateExternalProviderAvailabilityDto {
  @ApiProperty({ description: 'Day of week (0=Monday, 6=Sunday)', minimum: 0, maximum: 6 })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ description: 'Start time in HH:mm format', example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime: string;

  @ApiProperty({ description: 'End time in HH:mm format', example: '17:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime: string;

  @ApiPropertyOptional({ description: 'Specific service option ID (for service-specific availability)' })
  @IsOptional()
  @IsUUID()
  serviceOptionId?: string;
}

export class BulkCreateExternalProviderAvailabilityDto {
  @ApiProperty({ description: 'Array of availability slots', type: [CreateExternalProviderAvailabilityDto] })
  @IsArray()
  availabilities: CreateExternalProviderAvailabilityDto[];
}

export class CreateExternalProviderBlockedTimeDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format', example: '2024-12-25' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format',
  })
  date: string;

  @ApiPropertyOptional({ description: 'Start time in HH:mm format (required if not full day)', example: '10:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time in HH:mm format (required if not full day)', example: '12:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Block entire day', default: false })
  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @ApiPropertyOptional({ description: 'Reason for blocking' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ExternalProviderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  imageBase64?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
