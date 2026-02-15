import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsIn, IsArray } from 'class-validator';

export class AdminUpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Organization description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Industry' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Is organization active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUpdateOrganizationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  confirmationRequiredHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  confirmationDeadlineHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoCancelUnconfirmed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoConfirmAppointments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bufferTimeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxAppointmentsPerDay?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minAdvanceBookingHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxAdvanceBookingDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowProviderSelection?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoAssignProvider?: boolean;

  @ApiPropertyOptional({ enum: ['client_chooses', 'auto_assign'] })
  @IsOptional()
  @IsIn(['client_chooses', 'auto_assign'])
  providerSelectionMode?: 'client_chooses' | 'auto_assign';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showProviderNames?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showProviderPhotos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirmationMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sendEmailReminders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sendSmsReminders?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reminderHoursBefore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aiAssistantEnabled?: boolean;
}

export class AdminCreateServiceDto {
  @ApiProperty({ description: 'Service title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Service image as base64' })
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  duration: number;
}

export class AdminUpdateServiceDto {
  @ApiPropertyOptional({ description: 'Service title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Service image as base64' })
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Is service active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUpdateUserRoleDto {
  @ApiProperty({ description: 'New role for the user' })
  @IsString()
  role: string;
}

export class AdminSystemActionDto {
  @ApiProperty({ description: 'Action to perform' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ description: 'Target entity ID' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: 'Additional parameters' })
  @IsOptional()
  params?: Record<string, any>;
}

export class AdminBulkAssignProvidersDto {
  @ApiProperty({ description: 'Array of Clerk user IDs to assign as providers' })
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}
