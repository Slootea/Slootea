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
import { OrganizationSettingsService } from '../settings/organization-settings.service';
import { CreateAppointmentDto } from '../appointments/dto/appointment.dto';
import { UserServiceOptionsService } from '../service-options/user-service-options.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly bookingLinksService: BookingLinksService,
    private readonly serviceOptionsService: ServiceOptionsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly availabilityService: AvailabilityService,
    private readonly blockedTimesService: BlockedTimesService,
    private readonly organizationSettingsService: OrganizationSettingsService,
    private readonly userServiceOptionsService: UserServiceOptionsService,
  ) {}

  @Get('book/:slug')
  @ApiOperation({ summary: 'Get booking link details (public)' })
  async getBookingLink(@Param('slug') slug: string) {
    const bookingLink = await this.bookingLinksService.findBySlug(slug);

    if (!bookingLink.isActive) {
      throw new NotFoundException('Booking link is not active');
    }

    // Get organization settings
    const orgSettings = await this.organizationSettingsService.getPublicSettings(
      bookingLink.organizationId,
    );

    // If it's a specific option link, return just that option
    if (bookingLink.serviceOption) {
      return {
        ...bookingLink,
        serviceOptions: [bookingLink.serviceOption],
        settings: orgSettings,
      };
    }

    // Get all active service options for this organization
    const serviceOptions = await this.serviceOptionsService.findActiveByOrganization(
      bookingLink.organizationId,
    );

    return {
      ...bookingLink,
      serviceOptions,
      settings: orgSettings,
    };
  }

  @Get('book/:slug/slots')
  @ApiOperation({ summary: 'Get available time slots for a date' })
  @ApiQuery({ name: 'serviceOptionId', required: true })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  @ApiQuery({ name: 'providerId', required: false, description: 'Specific provider ID if provider selection is enabled' })
  async getAvailableSlots(
    @Param('slug') slug: string,
    @Query('serviceOptionId') serviceOptionId: string,
    @Query('date') date: string,
    @Query('providerId') providerId?: string,
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

    // Get available slots for the organization
    const slots = await this.appointmentsService.getAvailableSlotsForOrganization(
      bookingLink.organizationId,
      serviceOptionId,
      date,
      providerId,
    );

    return slots;
  }

  @Get('book/:slug/providers')
  @ApiOperation({ summary: 'Get available providers for a service' })
  @ApiQuery({ name: 'serviceOptionId', required: true })
  async getProviders(
    @Param('slug') slug: string,
    @Query('serviceOptionId') serviceOptionId: string,
  ) {
    const bookingLink = await this.bookingLinksService.findBySlug(slug);

    if (!bookingLink.isActive) {
      throw new NotFoundException('Booking link is not active');
    }

    // Get organization settings to check if provider selection is allowed
    const settings = await this.organizationSettingsService.findByOrganizationId(
      bookingLink.organizationId,
    );

    if (!settings.allowProviderSelection) {
      return { providers: [], providerSelectionEnabled: false };
    }

    // Get providers assigned to this service
    const providers = await this.userServiceOptionsService.getProvidersForService(
      serviceOptionId,
      bookingLink.organizationId,
    );

    // Filter provider info based on settings
    const filteredProviders = providers.map((p) => ({
      id: p.user?.id,
      clerkId: p.user?.clerkId,
      firstName: settings.showProviderNames ? p.user?.firstName : undefined,
      lastName: settings.showProviderNames ? p.user?.lastName : undefined,
      // photo: settings.showProviderPhotos ? p.user?.photoUrl : undefined,
    }));

    return {
      providers: filteredProviders,
      providerSelectionEnabled: true,
    };
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

    // Create appointment for the organization
    const appointment = await this.appointmentsService.createFromPublicOrganization(
      bookingLink.organizationId,
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
