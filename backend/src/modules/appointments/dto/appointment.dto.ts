import {
  IsString,
  IsOptional,
  IsEmail,
  IsUUID,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../entities/appointment.entity';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'Start time in ISO format' })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({ description: 'End time in ISO format (optional, calculated from service duration if not provided)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: 'Service option ID' })
  @IsUUID()
  serviceOptionId: string;

  @ApiProperty({ description: 'Client name' })
  @IsString()
  clientName: string;

  @ApiProperty({ description: 'Client email' })
  @IsEmail()
  clientEmail: string;

  @ApiPropertyOptional({ description: 'Client phone' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ description: 'Booking link ID' })
  @IsOptional()
  @IsUUID()
  bookingLinkId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetAvailableSlotsDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Service option ID' })
  @IsUUID()
  serviceOptionId: string;

  @ApiProperty({ description: 'Booking link ID' })
  @IsUUID()
  bookingLinkId: string;
}
