import { IsBoolean, IsOptional, IsString, IsDateString, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WhatsAppEventType, WhatsAppTemplateStatus } from '../entities/organization-whatsapp-template.entity';

/**
 * DTO for notification parameters (which events trigger notifications)
 */
export class NotificationParametersDto {
  @ApiProperty({ description: 'Send notification when appointment is created' })
  @IsBoolean()
  @IsOptional()
  appointmentCreated?: boolean;

  @ApiProperty({ description: 'Send reminder 24 hours before appointment' })
  @IsBoolean()
  @IsOptional()
  reminder24h?: boolean;

  @ApiProperty({ description: 'Send reminder 1 hour before appointment' })
  @IsBoolean()
  @IsOptional()
  reminder1h?: boolean;

  @ApiProperty({ description: 'Send notification when appointment is canceled' })
  @IsBoolean()
  @IsOptional()
  appointmentCanceled?: boolean;

  @ApiProperty({ description: 'Send notification when appointment is rescheduled' })
  @IsBoolean()
  @IsOptional()
  appointmentRescheduled?: boolean;
}

/**
 * DTO for updating WhatsApp settings (enable/disable + notification parameters)
 */
export class UpdateWhatsAppSettingsDto {
  @ApiProperty({ description: 'Enable/disable WhatsApp notifications' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Notification parameters configuration' })
  @ValidateNested()
  @Type(() => NotificationParametersDto)
  parameters: NotificationParametersDto;
}

/**
 * DTO for connecting WhatsApp Business Account
 */
export class ConnectWhatsAppDto {
  @ApiProperty({ description: 'WhatsApp Business Account ID' })
  @IsString()
  wabaId: string;

  @ApiProperty({ description: 'WhatsApp Phone Number ID' })
  @IsString()
  phoneNumberId: string;

  @ApiProperty({ description: 'Access token from Meta' })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({ description: 'Token expiration date' })
  @IsDateString()
  @IsOptional()
  tokenExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Display phone number (for UI)' })
  @IsString()
  @IsOptional()
  displayPhoneNumber?: string;
}

/**
 * DTO for assigning a WhatsApp template to an event
 */
export class AssignWhatsAppTemplateDto {
  @ApiProperty({ 
    description: 'Event type for this template',
    enum: WhatsAppEventType,
    example: WhatsAppEventType.REMINDER_24H,
  })
  @IsEnum(WhatsAppEventType)
  eventType: WhatsAppEventType;

  @ApiProperty({ description: 'WhatsApp template name as configured in Meta Business' })
  @IsString()
  templateName: string;

  @ApiProperty({ description: 'Template language code', example: 'en' })
  @IsString()
  languageCode: string;
}

/**
 * Response DTO for template mapping
 */
export class WhatsAppTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: WhatsAppEventType })
  eventType: WhatsAppEventType;

  @ApiProperty()
  templateName: string;

  @ApiProperty()
  languageCode: string;

  @ApiProperty({ enum: WhatsAppTemplateStatus })
  status: WhatsAppTemplateStatus;
}

/**
 * Response DTO for WhatsApp notification settings
 */
export class WhatsAppNotificationSettingsResponseDto {
  @ApiProperty({ description: 'Whether WhatsApp notifications are enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Whether WhatsApp Business is connected' })
  isConnected: boolean;

  @ApiPropertyOptional({ description: 'Connected phone number (if available)' })
  displayPhoneNumber?: string;

  @ApiProperty({ description: 'Notification parameters' })
  parameters: {
    appointmentCreated: boolean;
    reminder24h: boolean;
    reminder1h: boolean;
    appointmentCanceled: boolean;
    appointmentRescheduled: boolean;
  };

  @ApiProperty({ description: 'Template mappings for each event type', type: [WhatsAppTemplateResponseDto] })
  templates: WhatsAppTemplateResponseDto[];
}
