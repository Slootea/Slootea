import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { UserOrganizationRole } from './entities/user-organization.entity';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  create(@Body() createOrganizationDto: CreateOrganizationDto, @Request() req: any) {
    return this.organizationsService.create(createOrganizationDto, req.user.dbUserId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations for current user' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  findAll(@Request() req: any) {
    return this.organizationsService.findAllForUser(req.user.dbUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto, @Request() req: any) {
    return this.organizationsService.update(id, updateOrganizationDto, req.user.dbUserId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.organizationsService.remove(id, req.user.dbUserId);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite user to organization' })
  @ApiResponse({ status: 201, description: 'User invited successfully' })
  inviteUser(@Param('id') id: string, @Body() inviteUserDto: InviteUserDto, @Request() req: any) {
    return this.organizationsService.inviteUser(id, inviteUserDto.email, UserOrganizationRole.RECRUITER, req.user.dbUserId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  getMembers(@Param('id') id: string, @Request() req: any) {
    return this.organizationsService.getMembers(id, req.user.dbUserId);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  updateMemberRole(
    @Param('id') id: string, 
    @Param('memberId') memberId: string, 
    @Body() updateMemberRoleDto: UpdateMemberRoleDto, 
    @Request() req: any
  ) {
    return this.organizationsService.updateMemberRole(id, memberId, updateMemberRoleDto.role, req.user.dbUserId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: any) {
    return this.organizationsService.removeMember(id, memberId, req.user.dbUserId);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add member to organization by email' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  addMember(@Body() inviteUserDto: InviteUserDto, @Request() req: any) {
    return this.organizationsService.addMember(inviteUserDto.organizationId, inviteUserDto.email, req.user.dbUserId);
  }
}
