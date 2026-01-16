import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BookingLinksService } from '../booking-links/booking-links.service';
import { ServiceOptionsService } from '../service-options/service-options.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../availability/availability.service';
import { BlockedTimesService } from '../blocked-times/blocked-times.service';
import { SettingsService } from '../settings/settings.service';
import { CreateAppointmentDto } from '../appointments/dto/appointment.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly bookingLinksService: BookingLinksService,
    private readonly serviceOptionsService: ServiceOptionsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly availabilityService: AvailabilityService,
    private readonly blockedTimesService: BlockedTimesService,
    private readonly settingsService: SettingsService,
  ) {}

  @Get('book/:slug')
  @ApiOperation({ summary: 'Get booking link details (public)' })
  async getBookingLink(@Param('slug') slug: string) {
    const bookingLink = await this.bookingLinksService.findBySlug(slug);

    if (!bookingLink.isActive) {
      throw new NotFoundException('Booking link is not active');
    }

    // If it's a specific option link, return just that option
    if (bookingLink.serviceOption) {
      return {
        ...bookingLink,
        serviceOptions: [bookingLink.serviceOption],
      };
    }

    // Get all active service options for this user
    const serviceOptions = await this.serviceOptionsService.findActiveByUser(
      bookingLink.userId,
    );

    return {
      ...bookingLink,
      serviceOptions,
    };
  }

  @Get('book/:slug/slots')
  @ApiOperation({ summary: 'Get available time slots for a date' })
  @ApiQuery({ name: 'serviceOptionId', required: true })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  async getAvailableSlots(
    @Param('slug') slug: string,
    @Query('serviceOptionId') serviceOptionId: string,
    @Query('date') date: string,
  ) {
    const bookingLink = await this.bookingLinksService.findBySlug(slug);

    if (!bookingLink.isActive) {
      throw new NotFoundException('Booking link is not active');
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    const slots = await this.appointmentsService.getAvailableSlots(
      bookingLink.userId,
      serviceOptionId,
      date,
    );

    return slots;
  }

  @Post('book/:slug')
  @ApiOperation({ summary: 'Create a new appointment booking' })
  async createBooking(
    @Param('slug') slug: string,
    @Body() createAppointmentDto: CreateAppointmentDto,
  ) {
    const bookingLink = await this.bookingLinksService.findBySlug(slug);

    if (!bookingLink.isActive) {
      throw new NotFoundException('Booking link is not active');
    }

    // Create appointment with the booking link's user
    const appointment = await this.appointmentsService.createFromPublic(
      bookingLink.userId,
      createAppointmentDto,
    );

    return appointment;
  }

  @Get('confirm/:token')
  @ApiOperation({ summary: 'Get appointment details by confirmation token' })
  async getAppointmentByToken(@Param('token') token: string) {
    const appointment = await this.appointmentsService.findByConfirmationToken(token);

    if (!appointment) {
      throw new NotFoundException('Invalid confirmation link');
    }

    return appointment;
  }

  @Post('confirm/:token')
  @ApiOperation({ summary: 'Confirm appointment attendance' })
  async confirmAppointment(@Param('token') token: string) {
    const appointment = await this.appointmentsService.confirmByToken(token);

    if (!appointment) {
      throw new NotFoundException('Invalid confirmation link');
    }

    return appointment;
  }
}
