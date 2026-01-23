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
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  BulkCreateAvailabilityDto,
} from './dto/availability.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly, OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';

@ApiTags('availability')
@Controller('availability')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // ==================== Personal Availability (Member can edit own) ====================

  @Post()
  @ApiOperation({ summary: 'Create a new availability slot for yourself' })
  async create(
    @Request() req: any,
    @Body() createDto: CreateAvailabilityDto,
  ) {
    return this.availabilityService.create(req.user.dbUserId, createDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple availability slots for yourself' })
  async createBulk(
    @Request() req: any,
    @Body() bulkDto: BulkCreateAvailabilityDto,
  ) {
    return this.availabilityService.createBulk(req.user.dbUserId, bulkDto.availabilities);
  }

  @Get()
  @ApiOperation({ summary: 'Get all availability slots for current user' })
  async findAll(@Request() req: any) {
    return this.availabilityService.findAllByUser(req.user.dbUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific availability slot' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.availabilityService.findOne(id, req.user.dbUserId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an availability slot' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.update(id, req.user.dbUserId, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an availability slot' })
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.availabilityService.remove(id, req.user.dbUserId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all availability slots for current user' })
  async removeAll(@Request() req: any) {
    return this.availabilityService.removeAllByUser(req.user.dbUserId);
  }

  // ==================== Admin Endpoints (Manage Any Member's Availability) ====================

  @Post('admin/member/:memberId')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Create availability for a member' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async createForMember(
    @Param('memberId') memberId: string,
    @Body() createDto: CreateAvailabilityDto,
  ) {
    return this.availabilityService.createForMember(memberId, createDto);
  }

  @Post('admin/member/:memberId/bulk')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Create bulk availability for a member' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async createBulkForMember(
    @Param('memberId') memberId: string,
    @Body() bulkDto: BulkCreateAvailabilityDto,
  ) {
    return this.availabilityService.createBulkForMember(memberId, bulkDto.availabilities);
  }

  @Get('admin/member/:memberId')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Get all availability for a member' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async findAllForMember(@Param('memberId') memberId: string) {
    return this.availabilityService.findAllByUser(memberId);
  }

  @Put('admin/:id')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Update any availability slot' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async updateAsAdmin(
    @Param('id') id: string,
    @Body() updateDto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.updateAsAdmin(id, updateDto);
  }

  @Delete('admin/:id')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Delete any availability slot' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async removeAsAdmin(@Param('id') id: string) {
    return this.availabilityService.removeAsAdmin(id);
  }

  @Delete('admin/member/:memberId/all')
  @UseGuards(OrgRolesGuard)
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Admin: Delete all availability for a member' })
  @ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
  async removeAllForMember(@Param('memberId') memberId: string) {
    return this.availabilityService.removeAllByUser(memberId);
  }
}
