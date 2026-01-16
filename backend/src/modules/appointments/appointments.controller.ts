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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // Protected routes (require authentication)
  @Get()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all appointments for current user' })
  async findAll(@Request() req: any) {
    return this.appointmentsService.findAllByUser(req.user.dbUserId);
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

  @Get(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific appointment' })
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, req.user.dbUserId);
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
    return this.appointmentsService.update(id, req.user.dbUserId, updateDto);
  }

  @Put(':id/cancel')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an appointment' })
  async cancel(@Request() req: any, @Param('id') id: string) {
    return this.appointmentsService.cancel(id, req.user.dbUserId);
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
