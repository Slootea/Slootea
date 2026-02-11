import { IsString, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageTemplateType } from '../entities/organization-message-template.entity';

export class CreateMessageTemplateDto {
  @ApiProperty({ enum: MessageTemplateType, description: 'Type of message template' })
  @IsEnum(MessageTemplateType)
  templateType: MessageTemplateType;

  @ApiPropertyOptional({ description: 'Email subject line (supports placeholders)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emailSubject?: string;

  @ApiProperty({ description: 'Message content (supports placeholders)' })
  @IsString()
  messageContent: string;

  @ApiPropertyOptional({ description: 'Whether this template is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMessageTemplateDto {
  @ApiPropertyOptional({ description: 'Email subject line (supports placeholders)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  emailSubject?: string;

  @ApiPropertyOptional({ description: 'Message content (supports placeholders)' })
  @IsOptional()
  @IsString()
  messageContent?: string;

  @ApiPropertyOptional({ description: 'Whether this template is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MessageTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ enum: MessageTemplateType })
  templateType: MessageTemplateType;

  @ApiPropertyOptional()
  emailSubject: string | null;

  @ApiProperty()
  messageContent: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AllMessageTemplatesResponseDto {
  @ApiProperty({ type: [MessageTemplateResponseDto] })
  templates: MessageTemplateResponseDto[];

  @ApiProperty({ description: 'Available placeholders for templates' })
  availablePlaceholders: string[];
}

export class DefaultTemplateDto {
  @ApiProperty({ description: 'Email subject line' })
  emailSubject: string;

  @ApiProperty({ description: 'Message content' })
  messageContent: string;
}

export class DefaultTemplatesResponseDto {
  @ApiProperty({ enum: MessageTemplateType, description: 'Template type' })
  templateType: MessageTemplateType;

  @ApiProperty({ type: DefaultTemplateDto })
  template: DefaultTemplateDto;
}

export class AllDefaultTemplatesResponseDto {
  @ApiProperty({ description: 'Language code' })
  language: string;

  @ApiProperty({ description: 'Map of template types to default templates' })
  templates: Record<string, DefaultTemplateDto>;
}
