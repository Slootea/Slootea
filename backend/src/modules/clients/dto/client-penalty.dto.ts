import { IsString, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PenaltyType } from '../entities/client-penalty.entity';

export class CreatePenaltyDto {
  @ApiProperty({ description: 'Client ID to penalize' })
  @IsUUID()
  clientId: string;

  @ApiProperty({ description: 'Type of penalty', enum: PenaltyType })
  @IsEnum(PenaltyType)
  type: PenaltyType;

  @ApiPropertyOptional({ description: 'Reason for the penalty' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Expiration date for suspension (ISO 8601 format)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class RemovePenaltyDto {
  @ApiPropertyOptional({ description: 'Reason for removing the penalty' })
  @IsOptional()
  @IsString()
  removalReason?: string;
}

export class ClientPenaltyResponse {
  id: string;
  clientId: string;
  organizationId: string;
  type: PenaltyType;
  status: string;
  reason: string | null;
  expiresAt: Date | null;
  issuedBy: string | null;
  removedBy: string | null;
  removedAt: Date | null;
  removalReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  client?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
}
