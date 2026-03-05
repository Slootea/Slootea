import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SmsEventType } from '../entities/sms-template.entity';

/**
 * Response DTO for SMS notification settings
 */
export class SmsNotificationSettingsResponseDto {
  @ApiProperty({ description: 'Whether SMS notifications are enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Whether SMS is configured (has credentials)' })
  isConfigured: boolean;

  @ApiProperty({ description: 'Whether using global credentials' })
  useGlobalCredentials: boolean;

  @ApiPropertyOptional({ description: 'SMS sender ID / source address' })
  sourceAddr?: string;

  @ApiProperty({ description: 'Language code for SMS templates' })
  templateLanguage: string;

  @ApiProperty({ description: 'Notification parameters' })
  parameters: {
    appointmentCreated: boolean;
    appointmentReminder: boolean;
    appointmentCanceled: boolean;
    appointmentRescheduled: boolean;
  };
}

/**
 * DTO for updating SMS settings
 */
export class UpdateSmsSettingsDto {
  @ApiProperty({ description: 'Enable/disable SMS notifications' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Use global Verimor credentials' })
  @IsOptional()
  @IsBoolean()
  useGlobalCredentials?: boolean;

  @ApiPropertyOptional({ description: 'Template language code' })
  @IsOptional()
  @IsString()
  templateLanguage?: string;

  @ApiPropertyOptional({ description: 'Notification parameters' })
  @IsOptional()
  parameters?: {
    appointmentCreated?: boolean;
    appointmentReminder?: boolean;
    appointmentCanceled?: boolean;
    appointmentRescheduled?: boolean;
  };
}

/**
 * DTO for connecting custom Verimor credentials
 */
export class ConnectSmsDto {
  @ApiProperty({ description: 'Verimor API username' })
  @IsString()
  @MinLength(1)
  username: string;

  @ApiProperty({ description: 'Verimor API password' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({ description: 'SMS sender ID / source address (alphanumeric header)' })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  sourceAddr?: string;
}

/**
 * Response DTO for SMS template
 */
export class SmsTemplateResponseDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Organization ID (null for default templates)' })
  organizationId?: string;

  @ApiProperty({ description: 'Event type', enum: SmsEventType })
  eventType: SmsEventType;

  @ApiProperty({ description: 'Language code' })
  language: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'SMS message content' })
  content: string;

  @ApiProperty({ description: 'Whether template is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether this is a system default template' })
  isDefault: boolean;
}

/**
 * DTO for creating a new SMS template
 */
export class CreateSmsTemplateDto {
  @ApiProperty({ description: 'Event type', enum: SmsEventType })
  @IsEnum(SmsEventType)
  eventType: SmsEventType;

  @ApiProperty({ description: 'Language code (e.g., tr, en)' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  language: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'SMS message content with variables' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}

/**
 * DTO for updating an SMS template
 */
export class UpdateSmsTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'SMS message content with variables' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content?: string;

  @ApiPropertyOptional({ description: 'Whether template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Response DTO for SMS templates list
 */
export class SmsTemplatesListResponseDto {
  @ApiProperty({ description: 'List of SMS templates', type: [SmsTemplateResponseDto] })
  templates: SmsTemplateResponseDto[];
}

/**
 * DTO for SMS balance check response
 */
export class SmsBalanceResponseDto {
  @ApiProperty({ description: 'Whether the balance check was successful' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Remaining SMS credits' })
  balance?: number;

  @ApiPropertyOptional({ description: 'Error message if check failed' })
  error?: string;
}
