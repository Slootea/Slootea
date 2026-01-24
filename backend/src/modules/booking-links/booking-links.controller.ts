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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { BookingLinksService } from './booking-links.service';
import {
  CreateBookingLinkDto,
  UpdateBookingLinkDto,
} from './dto/booking-link.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly, OrgMemberOrAdmin } from '../auth/decorators/org-roles.decorator';

@ApiTags('booking-links')
@Controller('booking-links')
@UseGuards(ClerkAuthGuard, OrgRolesGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', description: 'Organization ID', required: true })
export class BookingLinksController {
  constructor(private readonly bookingLinksService: BookingLinksService) {}

  // ==================== Organization Booking Links ====================
  // All booking links belong to organizations

  @Post()
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Create organization booking link (Admin only)' })
  async create(
    @Headers('x-organization-id') organizationId: string,
    @Body() createDto: CreateBookingLinkDto,
  ) {
    return this.bookingLinksService.create(organizationId, createDto);
  }

  @Get()
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get all organization booking links (All members)' })
  async findAll(
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.bookingLinksService.findAll(organizationId);
  }

  @Get(':id')
  @OrgMemberOrAdmin()
  @ApiOperation({ summary: 'Get a specific organization booking link' })
  async findOne(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.bookingLinksService.findOne(id, organizationId);
  }

  @Put(':id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Update organization booking link (Admin only)' })
  async update(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateBookingLinkDto,
  ) {
    return this.bookingLinksService.update(id, organizationId, updateDto);
  }

  @Delete(':id')
  @OrgAdminOnly()
  @ApiOperation({ summary: 'Delete organization booking link (Admin only)' })
  async remove(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.bookingLinksService.remove(id, organizationId);
  }
}
