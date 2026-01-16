import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserOrganizationRole } from '../entities/user-organization.entity';

export class UpdateMemberRoleDto {
  @ApiProperty({ 
    description: 'New role for the member',
    enum: UserOrganizationRole,
    enumName: 'UserOrganizationRole'
  })
  @IsEnum(UserOrganizationRole)
  role: UserOrganizationRole;
}
