import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationParametersDto } from './whatsapp-notification-settings.dto';

/**
 * DTO for updating SMS settings (enable/disable + notification parameters)
 */
export class UpdateSmsSettingsDto {
  @ApiProperty({ description: 'Enable/disable SMS notifications' })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Notification parameters configuration' })
  @ValidateNested()
  @Type(() => NotificationParametersDto)
  @IsOptional()
  parameters?: NotificationParametersDto;
}

/**
 * DTO for connecting Twilio SMS
 */
export class ConnectSmsDto {
  @ApiProperty({ description: 'Twilio Account SID' })
  @IsString()
  accountSid: string;

  @ApiProperty({ description: 'Twilio Auth Token' })
  @IsString()
  authToken: string;

  @ApiProperty({ description: 'Twilio phone number to send from (E.164 format)', example: '+15551234567' })
  @IsString()
  fromPhoneNumber: string;
}

/**
 * Response DTO for SMS notification settings
 */
export class SmsNotificationSettingsResponseDto {
  @ApiProperty({ description: 'Whether SMS notifications are enabled' })
  enabled: boolean;

  @ApiProperty({ description: 'Whether Twilio SMS is connected' })
  isConnected: boolean;

  @ApiPropertyOptional({ description: 'Connected phone number (if available)' })
  fromPhoneNumber?: string;

  @ApiPropertyOptional({ description: 'Twilio Account SID (masked)' })
  accountSidMasked?: string;

  @ApiProperty({ description: 'Notification parameters' })
  parameters: {
    appointmentCreated: boolean;
    reminder24h: boolean;
    reminder1h: boolean;
    appointmentCanceled: boolean;
    appointmentRescheduled: boolean;
  };
}
