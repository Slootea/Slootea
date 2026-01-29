import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceOptionDto {
  @ApiProperty({ description: 'Title of the service option' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the service' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Base64 encoded image data (data:image/...;base64,...)' })
  @IsOptional()
  @ValidateIf((o) => o.imageBase64 !== '' && o.imageBase64 !== null)
  @IsString()
  @Matches(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, {
    message: 'Image must be a valid base64 encoded image (data:image/...;base64,...)',
  })
  imageBase64?: string;

  @ApiProperty({ description: 'Duration in minutes', minimum: 5, maximum: 480 })
  @IsInt()
  @Min(5)
  @Max(480)
  duration: number;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Organization ID for org-level service' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class UpdateServiceOptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Base64 encoded image data (data:image/...;base64,...)' })
  @IsOptional()
  @ValidateIf((o) => o.imageBase64 !== '' && o.imageBase64 !== null)
  @IsString()
  @Matches(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, {
    message: 'Image must be a valid base64 encoded image (data:image/...;base64,...)',
  })
  imageBase64?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
