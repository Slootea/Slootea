import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentQueryDto,
  GetNextAvailableDto,
  CheckAvailabilityDto,
} from './dto/appointment.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { OrgRolesGuard } from '../auth/guards/org-roles.guard';
import { OrgAdminOnly } from '../auth/decorators/org-roles.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly usersService: UsersService,
  ) {}

  // Protected routes (require authentication)
  @Get()
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Organization ID' })
  @ApiOperation({ summary: 'Get all appointments for current user with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'serviceOptionId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user Clerk ID (org admin only)' })
  async findAll(
    @Request() req: any,
    @Query() query: AppointmentQueryDto,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    // If organization admin and userId filter is specified, convert Clerk ID to database user ID
    const isOrgAdmin = req.user.orgRole === 'org:admin';
    let targetUserId = req.user.dbUserId;
    
    if (isOrgAdmin && query.userId) {
      // userId from query is a Clerk ID, need to convert to database ID
      const targetUser = await this.usersService.findByClerkId(query.userId);
      if (targetUser) {
        targetUserId = targetUser.id;
      }
    }
    
    // If admin filtering all members (no specific userId), get all org appointments
    if (isOrgAdmin && organizationId && !query.userId) {
      return this.appointmentsService.findAllByOrganizationPaginated(organizationId, query);
    }
    
    return this.appointmentsService.findAllByUserPaginated(targetUserId, query);
  }

  @Get('today')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get today\'s appointments' })
  async findToday(@Request() req: any) {
    return this.appointmentsService.findTodayAppointments(req.user.dbUserId);
  }

  @Get('upcoming')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get upcoming confirmed appointments' })
  async findUpcoming(@Request() req: any) {
    return this.appointmentsService.findUpcoming(req.user.dbUserId);
  }

  @Get('next')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the next upcoming appointment' })
  async findNext(@Request() req: any) {
    return this.appointmentsService.findNextAppointment(req.user.dbUserId);
  }

  @Get('pending')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get appointments pending confirmation' })
  async findPending(@Request() req: any) {
    return this.appointmentsService.findPendingConfirmation(req.user.dbUserId);
  }

  @Get('stats')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats(@Request() req: any) {
    return this.appointmentsService.getDashboardStats(req.user.dbUserId);
  }

  @Get('next-available')
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Organization ID' })
  @ApiOperation({ summary: 'Get next available time slot for a service' })
  @ApiQuery({ name: 'serviceOptionId', required: true, type: String })
  @ApiQuery({ name: 'providerId', required: false, type: String, description: 'Provider Clerk ID' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Start searching from this date (ISO format)' })
  async getNextAvailable(
    @Request() req: any,
    @Query('serviceOptionId') serviceOptionId: string,
    @Query('providerId') providerId?: string,
    @Query('fromDate') fromDate?: string,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.appointmentsService.getNextAvailableTime(
      req.user.dbUserId,
      serviceOptionId,
      providerId,
      fromDate,
      organizationId,
    );
  }

  @Post('check-availability')
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Organization ID' })
  @ApiOperation({ summary: 'Check if a time slot is available' })
  async checkAvailability(
    @Request() req: any,
    @Body() checkDto: CheckAvailabilityDto,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    return this.appointmentsService.checkTimeSlotAvailability(
      req.user.dbUserId,
      checkDto.serviceOptionId,
      checkDto.startTime,
      checkDto.providerId,
      organizationId,
    );
  }

  @Get(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific appointment' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, req.user.dbUserId);
  }

  @Post()
  @UseGuards(ClerkAuthGuard, OrgRolesGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-organization-id', required: false, description: 'Organization ID' })
  @ApiOperation({ summary: 'Create a new appointment from dashboard' })
  async createFromDashboard(
    @Request() req: any,
    @Body() createDto: CreateAppointmentDto,
    @Headers('x-organization-id') organizationId?: string,
  ) {
    const isOrgAdmin = req.user.orgRole === 'org:admin';
    
    // If provider ID is specified and user is admin, use that provider
    // Otherwise, use the current user as provider
    let targetUserId = req.user.dbUserId;
    
    if (createDto.providerId && isOrgAdmin && organizationId) {
      // Admin can assign to any provider - providerId is a Clerk ID
      const targetUser = await this.usersService.findByClerkId(createDto.providerId);
      if (targetUser) {
        targetUserId = targetUser.id;
      }
    } else if (createDto.providerId && !isOrgAdmin) {
      // Non-admin cannot assign to other providers - ignore providerId
      delete createDto.providerId;
    }
    
    return this.appointmentsService.createFromDashboard(
      targetUserId,
      createDto,
      organizationId,
    );
  }

  @Put(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an appointment' })
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateAppointmentDto,
  ) {
    const organizationId = req.organizationId || req.headers['x-organization-id'];
    return this.appointmentsService.update(id, req.user.dbUserId, updateDto, organizationId);
  }

  @Put(':id/cancel')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an appointment' })
  async cancel(@Request() req: any, @Param('id') id: string) {
    const organizationId = req.organizationId || req.headers['x-organization-id'];
    return this.appointmentsService.cancel(id, req.user.dbUserId, organizationId);
  }

  @Put(':id/confirm')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm an appointment from dashboard' })
  async confirmFromDashboard(@Request() req: any, @Param('id') id: string) {
    return this.appointmentsService.confirmFromDashboard(id, req.user.dbUserId);
  }

  @Put(':id/complete')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark an appointment as completed from dashboard' })
  async completeFromDashboard(@Request() req: any, @Param('id') id: string) {
    return this.appointmentsService.completeFromDashboard(id, req.user.dbUserId);
  }

  // Public routes (no authentication required)
  @Get('public/slots')
  @ApiOperation({ summary: 'Get available slots for booking (public)' })
  async getAvailableSlots(
    @Query('linkId') linkId: string,
    @Query('serviceOptionId') serviceOptionId: string,
    @Query('date') date: string,
  ) {
    return this.appointmentsService.getAvailableSlots(
      linkId,
      serviceOptionId,
      date,
    );
  }

  @Post('public/book')
  @ApiOperation({ summary: 'Create a new appointment (public)' })
  async createBooking(@Body() createDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createDto);
  }

  @Get('public/confirm/:token')
  @ApiOperation({ summary: 'Get appointment by confirmation token (public)' })
  async getByToken(@Param('token') token: string) {
    return this.appointmentsService.findByConfirmationToken(token);
  }

  @Post('public/confirm/:token')
  @ApiOperation({ summary: 'Confirm appointment attendance (public)' })
  async confirmAttendance(@Param('token') token: string) {
    return this.appointmentsService.confirmAppointment(token);
  }
}
