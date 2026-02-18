import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Request,
  Headers
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly, OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';
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
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update organization (Admin only)' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto, @Request() req: any) {
    return this.organizationsService.update(id, updateOrganizationDto, req.user.dbUserId);
  }

  @Delete(':id')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Delete organization (Admin only)' })
  @ApiResponse({ status: 200, description: 'Organization deleted successfully' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.organizationsService.remove(id, req.user.dbUserId);
  }

  @Post(':id/invite')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Invite user to organization (Admin only)' })
  @ApiResponse({ status: 201, description: 'User invited successfully' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  inviteUser(@Param('id') id: string, @Body() inviteUserDto: InviteUserDto, @Request() req: any) {
    return this.organizationsService.inviteUser(id, inviteUserDto.email, UserOrganizationRole.RECRUITER, req.user.dbUserId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  getMembers(@Param('id') id: string, @Request() req: any) {
    // Pass Clerk user ID (req.user.id) for Clerk API calls
    return this.organizationsService.getMembers(id, req.user.id);
  }

  @Patch(':id/members/:memberId')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update member role (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  updateMemberRole(
    @Param('id') id: string, 
    @Param('memberId') memberId: string, 
    @Body() updateMemberRoleDto: UpdateMemberRoleDto, 
    @Request() req: any
  ) {
    return this.organizationsService.updateMemberRole(id, memberId, updateMemberRoleDto.role, req.user.dbUserId);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Remove member from organization (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Request() req: any) {
    return this.organizationsService.removeMember(id, memberId, req.user.dbUserId);
  }

  @Post('add')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Add member to organization by email (Admin only)' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  addMember(@Body() inviteUserDto: InviteUserDto, @Request() req: any) {
    return this.organizationsService.addMember(inviteUserDto.organizationId, inviteUserDto.email, req.user.dbUserId);
  }

  @Get(':id/my-role')
  @ApiOperation({ summary: 'Get current user role in organization' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  getMyRole(@Param('id') id: string, @Request() req: any) {
    return this.organizationsService.getOrganizationRole(id, req.user.dbUserId);
  }

  @Get(':id/onboarding-status')
  @ApiOperation({ summary: 'Get onboarding status for organization' })
  @ApiResponse({ status: 200, description: 'Onboarding status retrieved successfully' })
  getOnboardingStatus(@Param('id') id: string) {
    return this.organizationsService.getOnboardingStatus(id);
  }

  @Post(':id/complete-onboarding')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Complete onboarding for organization (Admin only)' })
  @ApiResponse({ status: 201, description: 'Onboarding completed successfully' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  completeOnboarding(@Param('id') id: string) {
    return this.organizationsService.completeOnboarding(id);
  }
}
