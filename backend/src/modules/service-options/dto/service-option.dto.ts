import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsUrl,
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

  @ApiPropertyOptional({ description: 'Image URL for the service' })
  @IsOptional()
  @ValidateIf((o) => o.imageUrl !== '')
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ description: 'Duration in minutes', minimum: 5, maximum: 480 })
  @IsInt()
  @Min(5)
  @Max(480)
  duration: number;

  @ApiPropertyOptional({ description: 'Sort order for display' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
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

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => o.imageUrl !== '')
  @IsUrl()
  imageUrl?: string;

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
