import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BookingLinksService } from '../booking-links/booking-links.service';
import { ServiceOptionsService } from '../service-options/service-options.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AvailabilityService } from '../availability/availability.service';
import { BlockedTimesService } from '../blocked-times/blocked-times.service';
import { OrganizationSettingsService } from '../settings/organization-settings.service';
import { CreateAppointmentDto, UpdateAppointmentByTokenDto, CancelAppointmentByTokenDto } from '../appointments/dto/appointment.dto';
import { UserServiceOptionsService } from '../service-options/user-service-options.service';
import { ClerkService } from '../auth/clerk.service';
import { ClientPenaltyService } from '../clients/client-penalty.service';
import { OrganizationsService } from '../organizations/organizations.service';

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
    private readonly clerkService: ClerkService,
    private readonly clientPenaltyService: ClientPenaltyService,
    private readonly organizationsService: OrganizationsService,
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

    // Get organization info for metadata (name and logo)
    let organization = null;
    try {
      organization = await this.organizationsService.findOne(bookingLink.organizationId);
    } catch {
      // Organization not found in local DB, ignore
    }

    // If it's a specific option link, return just that option
    if (bookingLink.serviceOption) {
      return {
        ...bookingLink,
        serviceOptions: [bookingLink.serviceOption],
        settings: orgSettings,
        organization: organization ? {
          name: organization.name,
          logoUrl: organization.logo_url,
        } : null,
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
      organization: organization ? {
        name: organization.name,
        logoUrl: organization.logo_url,
      } : null,
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

  @Get('book/:slug/available-dates')
  @ApiOperation({ summary: 'Get dates with available slots for a month' })
  @ApiQuery({ name: 'serviceOptionId', required: true })
  @ApiQuery({ name: 'month', required: true, description: 'Month in YYYY-MM format' })
  @ApiQuery({ name: 'providerId', required: false, description: 'Specific provider ID if provider selection is enabled' })
  async getAvailableDates(
    @Param('slug') slug: string,
    @Query('serviceOptionId') serviceOptionId: string,
    @Query('month') month: string,
    @Query('providerId') providerId?: string,
  ) {
    const bookingLink = await this.bookingLinksService.findBySlug(slug);

    if (!bookingLink.isActive) {
      throw new NotFoundException('Booking link is not active');
    }

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      throw new BadRequestException('Invalid month format. Use YYYY-MM');
    }

    // Get available dates for the organization
    const availableDates = await this.appointmentsService.getAvailableDatesForOrganization(
      bookingLink.organizationId,
      serviceOptionId,
      month,
      providerId,
    );

    return { availableDates };
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

    // Check if provider selection mode is 'client_chooses'
    if (settings.providerSelectionMode !== 'client_chooses') {
      return { providers: [], providerSelectionEnabled: false };
    }

    // Get unified providers (both members and external) assigned to this service
    const providers = await this.userServiceOptionsService.getUnifiedProvidersForService(
      serviceOptionId,
      bookingLink.organizationId,
    );

    // Map providers to response format with visibility settings applied
    const filteredProviders = providers.map((p) => {
      const displayName = p.type === 'external' 
        ? p.name 
        : `${p.firstName || ''} ${p.lastName || ''}`.trim();
      
      return {
        id: p.id,
        type: p.type,
        clerkId: p.clerkId,
        name: settings.showProviderNames ? displayName : undefined,
        firstName: p.type === 'member' && settings.showProviderNames ? p.firstName : undefined,
        lastName: p.type === 'member' && settings.showProviderNames ? p.lastName : undefined,
        imageUrl: settings.showProviderPhotos ? p.imageUrl : undefined,
      };
    });

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

    // Check if client has any active penalties (ban or suspension)
    if (createAppointmentDto.clientPhone) {
      const penaltyCheck = await this.clientPenaltyService.checkClientCanBookByPhone(
        createAppointmentDto.clientPhone,
        bookingLink.organizationId,
      );

      if (!penaltyCheck.canBook) {
        throw new ForbiddenException(penaltyCheck.reason);
      }
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

  @Get('appointment/:token')
  @ApiOperation({ summary: 'Get full appointment details by token for management' })
  async getAppointmentForManagement(@Param('token') token: string) {
    const appointment = await this.appointmentsService.findByConfirmationToken(token);

    if (!appointment) {
      throw new NotFoundException('Invalid appointment link');
    }

    // Get organization settings for timezone and cancellation policy
    const settings = await this.organizationSettingsService.getPublicSettings(
      appointment.serviceOption?.organizationId || '',
    );

    // Check if appointment can still be modified
    const now = new Date();
    const appointmentStart = new Date(appointment.startTime);
    const hoursUntilAppointment = (appointmentStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    const canModify = hoursUntilAppointment >= (settings.minAdvanceBookingHours || 24) &&
      appointment.status !== 'cancelled' &&
      appointment.status !== 'completed';

    return {
      ...appointment,
      canModify,
      canCancel: hoursUntilAppointment > 0 && 
        appointment.status !== 'cancelled' && 
        appointment.status !== 'completed',
      cancellationPolicy: settings.cancellationPolicy,
      timezone: settings.timezone,
    };
  }

  @Put('appointment/:token')
  @ApiOperation({ summary: 'Update appointment by token (for clients)' })
  async updateAppointmentByToken(
    @Param('token') token: string,
    @Body() updateDto: UpdateAppointmentByTokenDto,
  ) {
    const appointment = await this.appointmentsService.findByConfirmationToken(token);

    if (!appointment) {
      throw new NotFoundException('Invalid appointment link');
    }

    // Check if appointment can still be modified
    const now = new Date();
    const appointmentStart = new Date(appointment.startTime);
    const hoursUntilAppointment = (appointmentStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Get organization settings
    const settings = await this.organizationSettingsService.findByOrganizationId(
      appointment.serviceOption?.organizationId || '',
    );

    if (hoursUntilAppointment < settings.minAdvanceBookingHours) {
      throw new BadRequestException(
        `Appointments can only be modified at least ${settings.minAdvanceBookingHours} hours in advance`,
      );
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      throw new BadRequestException('This appointment cannot be modified');
    }

    // If changing the start time, validate the new slot is available
    if (updateDto.startTime) {
      const updatedAppointment = await this.appointmentsService.updateByToken(
        token,
        updateDto,
        appointment.serviceOption?.organizationId || '',
      );
      return updatedAppointment;
    }

    // For non-time updates, just update directly
    const updatedAppointment = await this.appointmentsService.updateByToken(
      token,
      updateDto,
      appointment.serviceOption?.organizationId || '',
    );

    return updatedAppointment;
  }

  @Post('appointment/:token/cancel')
  @ApiOperation({ summary: 'Cancel appointment by token (for clients)' })
  async cancelAppointmentByToken(
    @Param('token') token: string,
    @Body() cancelDto: CancelAppointmentByTokenDto,
  ) {
    const appointment = await this.appointmentsService.findByConfirmationToken(token);

    if (!appointment) {
      throw new NotFoundException('Invalid appointment link');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('This appointment is already cancelled');
    }

    if (appointment.status === 'completed') {
      throw new BadRequestException('Completed appointments cannot be cancelled');
    }

    const cancelledAppointment = await this.appointmentsService.cancelByToken(
      token,
      cancelDto.reason,
      appointment.serviceOption?.organizationId || '',
    );

    return cancelledAppointment;
  }

  @Get('appointment/:token/available-slots')
  @ApiOperation({ summary: 'Get available slots for rescheduling an appointment' })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  async getAvailableSlotsForReschedule(
    @Param('token') token: string,
    @Query('date') date: string,
  ) {
    const appointment = await this.appointmentsService.findByConfirmationToken(token);

    if (!appointment) {
      throw new NotFoundException('Invalid appointment link');
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Get available slots for the same service and provider
    const slots = await this.appointmentsService.getAvailableSlotsForOrganization(
      appointment.organizationId,
      appointment.serviceOptionId,
      date,
      appointment.user?.clerkId, // Keep same provider
    );

    return slots;
  }

  @Get('appointment/:token/available-dates')
  @ApiOperation({ summary: 'Get available dates for rescheduling an appointment' })
  @ApiQuery({ name: 'month', required: true, description: 'Month in YYYY-MM format' })
  async getAvailableDatesForReschedule(
    @Param('token') token: string,
    @Query('month') month: string,
  ) {
    const appointment = await this.appointmentsService.findByConfirmationToken(token);

    if (!appointment) {
      throw new NotFoundException('Invalid appointment link');
    }

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      throw new BadRequestException('Invalid month format. Use YYYY-MM');
    }

    // Get available dates for the same service and provider
    const availableDates = await this.appointmentsService.getAvailableDatesForOrganization(
      appointment.organizationId,
      appointment.serviceOptionId,
      month,
      appointment.user?.clerkId, // Keep same provider
    );

    return { availableDates };
  }
}
