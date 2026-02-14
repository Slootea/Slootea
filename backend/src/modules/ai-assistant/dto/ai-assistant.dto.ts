import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @ApiProperty({ description: 'Message role', enum: ['user', 'assistant'] })
  @IsString()
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;
}

export class AiAssistantChatDto {
  @ApiProperty({ description: 'User message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Conversation history', type: [ChatMessageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];

  @ApiProperty({ description: 'Organization ID to fetch services from' })
  @IsString()
  organizationId: string;
}

export class ServiceSuggestionDto {
  @ApiProperty({ description: 'Service ID' })
  id: string;

  @ApiProperty({ description: 'Service title' })
  title: string;

  @ApiProperty({ description: 'Service description' })
  description: string;

  @ApiProperty({ description: 'Service duration in minutes' })
  duration: number;

  @ApiPropertyOptional({ description: 'Service image' })
  imageBase64?: string;

  @ApiProperty({ description: 'Relevance score 0-1' })
  relevanceScore: number;
}

export class AiAssistantResponseDto {
  @ApiProperty({ description: 'AI response message' })
  message: string;

  @ApiPropertyOptional({ description: 'Suggested services', type: [ServiceSuggestionDto] })
  suggestedServices?: ServiceSuggestionDto[];

  @ApiProperty({ description: 'Whether the assistant needs more information' })
  needsMoreInfo: boolean;

  @ApiPropertyOptional({ description: 'Response type', enum: ['service', 'message'] })
  responseType?: 'service' | 'message';

  @ApiPropertyOptional({ description: 'Service ID if type is service' })
  serviceId?: string | null;
}
