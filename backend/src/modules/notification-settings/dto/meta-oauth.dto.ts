import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for initiating Meta OAuth flow
 */
export class InitiateMetaOAuthDto {
  @ApiProperty({ description: 'Organization ID to connect WhatsApp to' })
  @IsString()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Custom redirect URI (defaults to server callback)' })
  @IsString()
  @IsOptional()
  redirectUri?: string;
}

/**
 * DTO for Meta OAuth callback
 */
export class MetaOAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from Meta' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'State parameter for CSRF protection' })
  @IsString()
  @IsOptional()
  state?: string;
}

/**
 * Response for OAuth URL generation
 */
export class MetaOAuthUrlResponseDto {
  @ApiProperty({ description: 'OAuth URL to redirect user to' })
  authUrl: string;

  @ApiProperty({ description: 'State token for CSRF protection' })
  state: string;
}

/**
 * Response when OAuth is successful
 */
export class MetaOAuthSuccessResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Connected WhatsApp Business Account ID' })
  wabaId: string;

  @ApiProperty({ description: 'Connected phone number ID' })
  phoneNumberId: string;

  @ApiPropertyOptional({ description: 'Display phone number' })
  displayPhoneNumber?: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;
}

/**
 * WhatsApp Business Account from Meta API
 */
export class WhatsAppBusinessAccountDto {
  @ApiProperty({ description: 'WABA ID' })
  id: string;

  @ApiProperty({ description: 'WABA Name' })
  name: string;

  @ApiPropertyOptional({ description: 'Business verification status' })
  account_review_status?: string;
}

/**
 * Phone number from Meta API
 */
export class WhatsAppPhoneNumberDto {
  @ApiProperty({ description: 'Phone number ID' })
  id: string;

  @ApiProperty({ description: 'Display phone number' })
  display_phone_number: string;

  @ApiProperty({ description: 'Verified name' })
  verified_name: string;

  @ApiPropertyOptional({ description: 'Quality rating' })
  quality_rating?: string;
}

/**
 * Available WhatsApp assets for selection
 */
export class WhatsAppAssetsResponseDto {
  @ApiProperty({ description: 'List of available WhatsApp Business Accounts', type: [WhatsAppBusinessAccountDto] })
  whatsappBusinessAccounts: WhatsAppBusinessAccountDto[];

  @ApiProperty({ description: 'List of phone numbers (keyed by WABA ID)' })
  phoneNumbers: Record<string, WhatsAppPhoneNumberDto[]>;
}

/**
 * DTO for completing OAuth connection with selected assets
 */
export class CompleteMetaOAuthDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Selected WhatsApp Business Account ID' })
  @IsString()
  wabaId: string;

  @ApiProperty({ description: 'Selected Phone Number ID' })
  @IsString()
  phoneNumberId: string;

  @ApiPropertyOptional({ description: 'Display phone number' })
  @IsString()
  @IsOptional()
  displayPhoneNumber?: string;
}
