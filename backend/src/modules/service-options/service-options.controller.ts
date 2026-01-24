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
import { ServiceOptionsService } from './service-options.service';
import {
  CreateServiceOptionDto,
  UpdateServiceOptionDto,
} from './dto/service-option.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly, OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';

@ApiTags('service-options')
@Controller('service-options')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ServiceOptionsController {
  constructor(private readonly serviceOptionsService: ServiceOptionsService) {}

  // ==================== Personal Service Options ====================

  @Post()
  @ApiOperation({ summary: 'Create a new personal service option' })
  async create(
    @Request() req: any,
    @Body() createDto: CreateServiceOptionDto,
  ) {
    return this.serviceOptionsService.create(req.user.dbUserId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all personal service options for current user' })
  async findAll(@Request() req: any) {
    return this.serviceOptionsService.findAllByUser(req.user.dbUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific personal service option' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.serviceOptionsService.findOne(id, req.user.dbUserId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a personal service option' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceOptionDto,
  ) {
    return this.serviceOptionsService.update(id, req.user.dbUserId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a personal service option' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.serviceOptionsService.remove(id, req.user.dbUserId);
  }

  // ==================== Organization Service Options (Admin Only) ====================

  @Post('organization')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Create organization service option (Admin only)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async createForOrganization(
    @Headers('x-organization-id') organizationId: string,
    @Body() createDto: CreateServiceOptionDto,
  ) {
    return this.serviceOptionsService.createForOrganization(organizationId, createDto);
  }

  @Get('organization/all')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all organization service options' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async findAllForOrganization(
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.serviceOptionsService.findAllByOrganization(organizationId);
  }

  @Get('organization/active')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get active organization service options' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async findActiveForOrganization(
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.serviceOptionsService.findActiveByOrganization(organizationId);
  }

  @Get('organization/:id')
  @UseGuards(OrgRolesGuard)
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get a specific organization service option' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async findOneInOrganization(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.serviceOptionsService.findOneInOrganization(id, organizationId);
  }

  @Put('organization/:id')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update organization service option (Admin only)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async updateInOrganization(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceOptionDto,
  ) {
    return this.serviceOptionsService.updateInOrganization(id, organizationId, updateDto);
  }

  @Delete('organization/:id')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Delete organization service option (Admin only)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async removeFromOrganization(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.serviceOptionsService.removeFromOrganization(id, organizationId);
  }
}
