import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WhatsAppEventType, WhatsAppTemplateStatus } from './whatsapp-notification-settings.dto';

/**
 * WhatsApp template category enum
 */
export enum WhatsAppTemplateCategory {
  UTILITY = 'UTILITY',
  MARKETING = 'MARKETING',
  AUTHENTICATION = 'AUTHENTICATION',
}

/**
 * DTO for template component button
 */
export class TemplateButtonDto {
  @ApiProperty({ enum: ['PHONE_NUMBER', 'URL', 'QUICK_REPLY'] })
  @IsString()
  type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY';

  @ApiProperty()
  @IsString()
  text: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  url?: string;
}

/**
 * DTO for template component example
 */
export class TemplateExampleDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  header_text?: string[];

  @ApiPropertyOptional({ type: 'array', items: { type: 'array', items: { type: 'string' } } })
  @IsArray()
  @IsOptional()
  body_text?: string[][];
}

/**
 * DTO for template component
 */
export class TemplateComponentDto {
  @ApiProperty({ enum: ['HEADER', 'BODY', 'FOOTER', 'BUTTONS'] })
  @IsString()
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';

  @ApiPropertyOptional({ enum: ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'] })
  @IsString()
  @IsOptional()
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ type: TemplateExampleDto })
  @ValidateNested()
  @Type(() => TemplateExampleDto)
  @IsOptional()
  example?: TemplateExampleDto;

  @ApiPropertyOptional({ type: [TemplateButtonDto] })
  @ValidateNested({ each: true })
  @Type(() => TemplateButtonDto)
  @IsArray()
  @IsOptional()
  buttons?: TemplateButtonDto[];
}

/**
 * DTO for creating a WhatsApp Business template
 */
export class CreateWhatsAppBusinessTemplateDto {
  @ApiProperty({ description: 'Template name (lowercase, underscores only)', example: 'appointment_reminder' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Language code', example: 'en_US' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Template category', enum: WhatsAppTemplateCategory, example: WhatsAppTemplateCategory.UTILITY })
  @IsEnum(WhatsAppTemplateCategory)
  category: WhatsAppTemplateCategory;

  @ApiProperty({ description: 'Template components', type: [TemplateComponentDto] })
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  @IsArray()
  components: TemplateComponentDto[];
}

/**
 * DTO for updating a WhatsApp Business template
 */
export class UpdateWhatsAppBusinessTemplateDto {
  @ApiProperty({ description: 'Template components', type: [TemplateComponentDto] })
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  @IsArray()
  components: TemplateComponentDto[];
}

/**
 * DTO for creating a template from local message content
 */
export class CreateTemplateFromMessageDto {
  @ApiProperty({ description: 'Event type to map this template to', enum: WhatsAppEventType })
  @IsEnum(WhatsAppEventType)
  eventType: WhatsAppEventType;

  @ApiProperty({ description: 'Message content with placeholders like {{clientName}}' })
  @IsString()
  messageContent: string;

  @ApiProperty({ description: 'Language code', example: 'en_US' })
  @IsString()
  language: string;

  @ApiPropertyOptional({ description: 'Custom template name (auto-generated if not provided)' })
  @IsString()
  @IsOptional()
  templateName?: string;
}

/**
 * Response DTO for WhatsApp Business template
 */
export class WhatsAppBusinessTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  language: string;

  @ApiProperty({ type: [TemplateComponentDto] })
  components: TemplateComponentDto[];

  @ApiPropertyOptional()
  rejectedReason?: string;

  @ApiPropertyOptional()
  qualityScore?: string;

  @ApiPropertyOptional({ enum: WhatsAppEventType })
  localEventType?: WhatsAppEventType;
}

/**
 * Response DTO for template list
 */
export class WhatsAppBusinessTemplatesListResponseDto {
  @ApiProperty({ type: [WhatsAppBusinessTemplateResponseDto] })
  templates: WhatsAppBusinessTemplateResponseDto[];

  @ApiProperty()
  isConnected: boolean;
}

/**
 * Response DTO for sync operation
 */
export class SyncTemplatesResponseDto {
  @ApiProperty({ description: 'Number of templates synced' })
  synced: number;

  @ApiProperty({ type: [WhatsAppBusinessTemplateResponseDto] })
  templates: WhatsAppBusinessTemplateResponseDto[];
}

/**
 * DTO for linking a Meta template to a local event type
 */
export class LinkTemplateToEventDto {
  @ApiProperty({ description: 'Event type to map this template to', enum: WhatsAppEventType })
  @IsEnum(WhatsAppEventType)
  eventType: WhatsAppEventType;

  @ApiProperty({ description: 'Template name as it exists in Meta' })
  @IsString()
  templateName: string;

  @ApiProperty({ description: 'Template language code' })
  @IsString()
  languageCode: string;
}
