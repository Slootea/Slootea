import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { UserServiceOptionsService } from './user-service-options.service';
import { AssignServiceDto, UpdateUserServiceDto, BulkAssignServicesDto } from './dto/user-service-option.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgMemberOrAdmin, OrgAdminOnly } from '../auth/decorators/org-roles.decorator';

@ApiTags('user-services')
@Controller('user-services')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class UserServiceOptionsController {
  constructor(
    private readonly userServiceOptionsService: UserServiceOptionsService,
  ) {}

  /**
   * Member assigns a service to themselves
   */
  @Post('my-services')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Assign a service to yourself' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async assignServiceToSelf(
    @Request() req: any,
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: AssignServiceDto,
  ) {
    return this.userServiceOptionsService.assignService(
      req.user.dbUserId,
      dto,
      organizationId,
    );
  }

  /**
   * Bulk assign services to self
   */
  @Post('my-services/bulk')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Bulk assign services to yourself' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async bulkAssignServicesToSelf(
    @Request() req: any,
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: BulkAssignServicesDto,
  ) {
    return this.userServiceOptionsService.bulkAssignServices(
      req.user.dbUserId,
      dto,
      organizationId,
    );
  }

  /**
   * Get services assigned to self
   */
  @Get('my-services')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get services assigned to you' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async getMyServices(@Request() req: any) {
    return this.userServiceOptionsService.findByUser(req.user.dbUserId);
  }

  /**
   * Remove a service assignment from self
   */
  @Delete('my-services/:serviceOptionId')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Remove a service assignment from yourself' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async removeServiceFromSelf(
    @Request() req: any,
    @Param('serviceOptionId') serviceOptionId: string,
  ) {
    return this.userServiceOptionsService.removeServiceAssignment(
      req.user.dbUserId,
      serviceOptionId,
    );
  }

  /**
   * Update own service assignment
   */
  @Put('my-services/:serviceOptionId')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Update your service assignment' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async updateMyService(
    @Request() req: any,
    @Param('serviceOptionId') serviceOptionId: string,
    @Body() dto: UpdateUserServiceDto,
  ) {
    return this.userServiceOptionsService.updateAssignment(
      req.user.dbUserId,
      serviceOptionId,
      dto,
    );
  }

  /**
   * Toggle own service assignment active status
   */
  @Post('my-services/:serviceOptionId/toggle')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Toggle your service assignment active status' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async toggleMyService(
    @Request() req: any,
    @Param('serviceOptionId') serviceOptionId: string,
  ) {
    return this.userServiceOptionsService.toggleActive(
      req.user.dbUserId,
      serviceOptionId,
    );
  }

  // ==================== Admin Endpoints ====================

  /**
   * Admin assigns a service to a member
   */
  @Post('members/:memberId')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Assign a service to a member' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async assignServiceToMember(
    @Param('memberId') memberId: string,
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: AssignServiceDto,
  ) {
    return this.userServiceOptionsService.assignService(
      memberId,
      dto,
      organizationId,
    );
  }

  /**
   * Admin gets services for a member
   */
  @Get('members/:memberId')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Get services assigned to a member' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async getMemberServices(@Param('memberId') memberId: string) {
    return this.userServiceOptionsService.findByUser(memberId);
  }

  /**
   * Admin removes service from member
   */
  @Delete('members/:memberId/:serviceOptionId')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Remove service assignment from member' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async removeServiceFromMember(
    @Param('memberId') memberId: string,
    @Param('serviceOptionId') serviceOptionId: string,
  ) {
    return this.userServiceOptionsService.removeServiceAssignment(
      memberId,
      serviceOptionId,
    );
  }

  /**
   * Get all providers for a specific service
   */
  @Get('service/:serviceOptionId/providers')
  @ApiOperation({ summary: 'Get all providers for a service' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async getProvidersForService(
    @Param('serviceOptionId') serviceOptionId: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.userServiceOptionsService.getProvidersForService(
      serviceOptionId,
      organizationId,
    );
  }
}
