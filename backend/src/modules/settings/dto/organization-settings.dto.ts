import { IsBoolean, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationSettingsDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;
}

export class UpdateOrganizationSettingsDto {
  // Booking Settings
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
  @Max(24)
  confirmationDeadlineHours?: number;

  @ApiPropertyOptional({ description: 'Auto-cancel if not confirmed before deadline' })
  @IsOptional()
  @IsBoolean()
  autoCancelUnconfirmed?: boolean;

  @ApiPropertyOptional({ description: 'Auto-confirm pending appointments when created' })
  @IsOptional()
  @IsBoolean()
  autoConfirmAppointments?: boolean;

  @ApiPropertyOptional({ description: 'Buffer time between appointments in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Maximum appointments per day per member' })
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

  // Provider Selection Settings
  @ApiPropertyOptional({ description: 'Allow clients to select specific provider when booking' })
  @IsOptional()
  @IsBoolean()
  allowProviderSelection?: boolean;

  @ApiPropertyOptional({ description: 'Auto-assign provider based on availability' })
  @IsOptional()
  @IsBoolean()
  autoAssignProvider?: boolean;

  @ApiPropertyOptional({ 
    description: 'Provider selection mode: client_chooses (clients select provider after service) or auto_assign (system assigns based on availability)',
    enum: ['client_chooses', 'auto_assign']
  })
  @IsOptional()
  @IsString()
  providerSelectionMode?: 'client_chooses' | 'auto_assign';

  @ApiPropertyOptional({ description: 'Show provider names to clients during booking' })
  @IsOptional()
  @IsBoolean()
  showProviderNames?: boolean;

  @ApiPropertyOptional({ description: 'Show provider photos to clients during booking' })
  @IsOptional()
  @IsBoolean()
  showProviderPhotos?: boolean;

  // Organization Display Settings
  @ApiPropertyOptional({ description: 'Welcome message for booking page' })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiPropertyOptional({ description: 'Booking instructions' })
  @IsOptional()
  @IsString()
  bookingInstructions?: string;

  @ApiPropertyOptional({ description: 'Confirmation message' })
  @IsOptional()
  @IsString()
  confirmationMessage?: string;

  @ApiPropertyOptional({ description: 'Cancellation policy' })
  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  // Notification Settings
  @ApiPropertyOptional({ description: 'Send email reminders' })
  @IsOptional()
  @IsBoolean()
  sendEmailReminders?: boolean;

  @ApiPropertyOptional({ description: 'Send SMS reminders' })
  @IsOptional()
  @IsBoolean()
  sendSmsReminders?: boolean;

  @ApiPropertyOptional({ description: 'Hours before appointment to send reminder' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  reminderHoursBefore?: number;

  @ApiPropertyOptional({ description: 'Organization timezone (e.g., UTC, Europe/Istanbul, America/New_York)' })
  @IsOptional()
  @IsString()
  timezone?: string;

  // AI Assistant Settings
  @ApiPropertyOptional({ description: 'Enable AI assistant for service selection on booking page' })
  @IsOptional()
  @IsBoolean()
  aiAssistantEnabled?: boolean;
}
