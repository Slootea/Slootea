import { IsEmail, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserOrganizationRole } from '../entities/user-organization.entity';

export class InviteUserDto {
  @ApiProperty({ description: 'Email of user to invite' })
  @IsEmail()
  email: string;
  
  @IsUUID()
  organizationId: string;
}
