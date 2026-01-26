import { IsString, IsBoolean, IsOptional, IsInt, Min, Max, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignServiceDto {
  @ApiProperty({ description: 'Service Option ID' })
  @IsUUID()
  serviceOptionId: string;

  @ApiPropertyOptional({ description: 'Whether this assignment is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Custom duration override in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  customDuration?: number;

  @ApiPropertyOptional({ description: 'Custom description for this user' })
  @IsOptional()
  @IsString()
  customDescription?: string;
}

export class BulkAssignServicesDto {
  @ApiProperty({ description: 'Array of service option IDs to assign', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  serviceOptionIds: string[];
}

export class BulkAssignMembersToServiceDto {
  @ApiProperty({ description: 'Array of member IDs (Clerk IDs or internal UUIDs) to assign to this service', type: [String] })
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}

export class UpdateUserServiceDto {
  @ApiPropertyOptional({ description: 'Whether this assignment is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Custom duration override in minutes' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  customDuration?: number;

  @ApiPropertyOptional({ description: 'Custom description for this user' })
  @IsOptional()
  @IsString()
  customDescription?: string;
}
