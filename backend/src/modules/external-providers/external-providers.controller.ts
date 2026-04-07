import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiParam } from '@nestjs/swagger';
import { ExternalProvidersService } from './external-providers.service';
import {
  CreateExternalProviderDto,
  UpdateExternalProviderDto,
  AssignServicesDto,
  CreateExternalProviderAvailabilityDto,
  BulkCreateExternalProviderAvailabilityDto,
  CreateExternalProviderBlockedTimeDto,
} from './dto/external-provider.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly } from '../auth/decorators/org-roles.decorator';

@ApiTags('external-providers')
@Controller('external-providers')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@OrgAdminOnly()
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
export class ExternalProvidersController {
  constructor(private readonly externalProvidersService: ExternalProvidersService) {}

  // ==================== CRUD Operations ====================

  @Post()
  @ApiOperation({ summary: 'Create a new external service provider' })
  async create(
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: CreateExternalProviderDto,
  ) {
    return this.externalProvidersService.create(organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all external providers for the organization' })
  async findAll(@Headers('x-organization-id') organizationId: string) {
    return this.externalProvidersService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async findOne(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.externalProvidersService.findOne(id, organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async update(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExternalProviderDto,
  ) {
    return this.externalProvidersService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async remove(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    await this.externalProvidersService.remove(id, organizationId);
    return { success: true };
  }

  // ==================== Service Assignment ====================

  @Get(':id/services')
  @ApiOperation({ summary: 'Get services assigned to an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async getAssignedServices(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.externalProvidersService.getAssignedServices(id, organizationId);
  }

  @Put(':id/services')
  @ApiOperation({ summary: 'Assign services to an external provider (replaces existing)' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async assignServices(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() dto: AssignServicesDto,
  ) {
    return this.externalProvidersService.assignServices(id, organizationId, dto.serviceOptionIds);
  }

  // ==================== Availability Management ====================

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get availability schedule for an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async getAvailability(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.externalProvidersService.getAvailability(id, organizationId);
  }

  @Post(':id/availability')
  @ApiOperation({ summary: 'Create a new availability slot for an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async createAvailability(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() dto: CreateExternalProviderAvailabilityDto,
  ) {
    return this.externalProvidersService.createAvailability(id, organizationId, dto);
  }

  @Post(':id/availability/bulk')
  @ApiOperation({ summary: 'Create multiple availability slots for an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async createBulkAvailability(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() dto: BulkCreateExternalProviderAvailabilityDto,
  ) {
    return this.externalProvidersService.createBulkAvailability(id, organizationId, dto.availabilities);
  }

  @Put(':id/availability/:availabilityId')
  @ApiOperation({ summary: 'Update an availability slot' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  @ApiParam({ name: 'availabilityId', description: 'Availability ID' })
  async updateAvailability(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Param('availabilityId') availabilityId: string,
    @Body() dto: Partial<CreateExternalProviderAvailabilityDto>,
  ) {
    return this.externalProvidersService.updateAvailability(id, availabilityId, organizationId, dto);
  }

  @Delete(':id/availability/:availabilityId')
  @ApiOperation({ summary: 'Delete an availability slot' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  @ApiParam({ name: 'availabilityId', description: 'Availability ID' })
  async deleteAvailability(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Param('availabilityId') availabilityId: string,
  ) {
    await this.externalProvidersService.deleteAvailability(id, availabilityId, organizationId);
    return { success: true };
  }

  @Delete(':id/availability')
  @ApiOperation({ summary: 'Clear all availability for an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async clearAllAvailability(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    await this.externalProvidersService.clearAllAvailability(id, organizationId);
    return { success: true };
  }

  // ==================== Blocked Times Management ====================

  @Get(':id/blocked-times')
  @ApiOperation({ summary: 'Get blocked times for an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async getBlockedTimes(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.externalProvidersService.getBlockedTimes(id, organizationId);
  }

  @Post(':id/blocked-times')
  @ApiOperation({ summary: 'Create a blocked time for an external provider' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  async createBlockedTime(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() dto: CreateExternalProviderBlockedTimeDto,
  ) {
    return this.externalProvidersService.createBlockedTime(id, organizationId, dto);
  }

  @Delete(':id/blocked-times/:blockedTimeId')
  @ApiOperation({ summary: 'Delete a blocked time' })
  @ApiParam({ name: 'id', description: 'External provider ID' })
  @ApiParam({ name: 'blockedTimeId', description: 'Blocked time ID' })
  async deleteBlockedTime(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Param('blockedTimeId') blockedTimeId: string,
  ) {
    await this.externalProvidersService.deleteBlockedTime(id, blockedTimeId, organizationId);
    return { success: true };
  }
}
