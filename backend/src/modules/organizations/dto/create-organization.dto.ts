import { IsString, IsNotEmpty, IsEmail, IsOptional, IsNumber, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Organization description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Industry' })
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiProperty({ description: 'Organization size', required: false })
  @IsNumber()
  @IsOptional()
  size?: number;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Location', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Website URL', required: false })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({ description: 'Logo URL', required: false })
  @IsUrl()
  @IsOptional()
  logo_url?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}
