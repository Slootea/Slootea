import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThan, Like, ILike, LessThanOrEqual, In } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentQueryDto,
  PaginatedResult,
} from './dto/appointment.dto';
import { ServiceOptionsService } from '../service-options/service-options.service';
import { AvailabilityService } from '../availability/availability.service';
import { BlockedTimesService } from '../blocked-times/blocked-times.service';
import { SettingsService } from '../settings/settings.service';
import { OrganizationSettingsService } from '../settings/organization-settings.service';
import { BookingLinksService } from '../booking-links/booking-links.service';
import { ClientsService } from '../clients/clients.service';
import { GamificationService } from '../gamification/gamification.service';
import { UserServiceOptionsService } from '../service-options/user-service-options.service';
import { DayOfWeek } from '../availability/entities/availability.entity';
import { v4 as uuidv4 } from 'uuid';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly serviceOptionsService: ServiceOptionsService,
    private readonly availabilityService: AvailabilityService,
    private readonly blockedTimesService: BlockedTimesService,
    private readonly settingsService: SettingsService,
    private readonly organizationSettingsService: OrganizationSettingsService,
    private readonly bookingLinksService: BookingLinksService,
    @Inject(forwardRef(() => ClientsService))
    private readonly clientsService: ClientsService,
    @Inject(forwardRef(() => GamificationService))
    private readonly gamificationService: GamificationService,
    @Inject(forwardRef(() => UserServiceOptionsService))
    private readonly userServiceOptionsService: UserServiceOptionsService,
  ) {}

  async create(createDto: CreateAppointmentDto): Promise<Appointment> {
    // Get booking link to find the organization
    const bookingLink = await this.bookingLinksService.findBySlug(
      createDto.bookingLinkId || '',
    );
    
    // Use the new organization-based booking flow
    return this.createFromPublicOrganization(bookingLink.organizationId, createDto);
  }

  async findAllByUser(userId: string): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: { userId },
      relations: ['serviceOption'],
      order: { startTime: 'DESC' },
    });
  }

  async findAllByUserPaginated(
    userId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedResult<Appointment>> {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
      serviceOptionId,
      sortBy = 'startTime',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.serviceOption', 'serviceOption')
      .where('appointment.userId = :userId', { userId });

    // Filter by status
    if (status) {
      queryBuilder.andWhere('appointment.status = :status', { status });
    }

    // Search by client name, email, or phone
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(appointment.clientName) LIKE LOWER(:search) OR LOWER(appointment.clientEmail) LIKE LOWER(:search) OR appointment.clientPhone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by date range
    if (startDate) {
      queryBuilder.andWhere('appointment.startTime >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('appointment.startTime <= :endDate', {
        endDate: endDateTime,
      });
    }

    // Filter by service option
    if (serviceOptionId) {
      queryBuilder.andWhere('appointment.serviceOptionId = :serviceOptionId', {
        serviceOptionId,
      });
    }

    // Sorting
    const validSortFields = ['startTime', 'clientName', 'status', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'startTime';
    queryBuilder.orderBy(`appointment.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findAllByOrganizationPaginated(
    organizationId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedResult<Appointment>> {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
      serviceOptionId,
      sortBy = 'startTime',
      sortOrder = 'DESC',
    } = query;

    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.serviceOption', 'serviceOption')
      .leftJoinAndSelect('appointment.user', 'user')
      .where('user.organizationId = :organizationId', { organizationId });

    // Filter by status
    if (status) {
      queryBuilder.andWhere('appointment.status = :status', { status });
    }

    // Search by client name, email, or phone
    if (search) {
      queryBuilder.andWhere(
        '(LOWER(appointment.clientName) LIKE LOWER(:search) OR LOWER(appointment.clientEmail) LIKE LOWER(:search) OR appointment.clientPhone LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by date range
    if (startDate) {
      queryBuilder.andWhere('appointment.startTime >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('appointment.startTime <= :endDate', {
        endDate: endDateTime,
      });
    }

    // Filter by service option
    if (serviceOptionId) {
      queryBuilder.andWhere('appointment.serviceOptionId = :serviceOptionId', {
        serviceOptionId,
      });
    }

    // Sorting
    const validSortFields = ['startTime', 'clientName', 'status', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'startTime';
    queryBuilder.orderBy(`appointment.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findUpcoming(userId: string): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: {
        userId,
        startTime: MoreThanOrEqual(new Date()),
        status: AppointmentStatus.CONFIRMED,
      },
      relations: ['serviceOption'],
      order: { startTime: 'ASC' },
    });
  }

  async findNextAppointment(userId: string): Promise<Appointment | null> {
    return this.appointmentRepository.findOne({
      where: [
        {
          userId,
          startTime: MoreThanOrEqual(new Date()),
          status: AppointmentStatus.CONFIRMED,
        },
        {
          userId,
          startTime: MoreThanOrEqual(new Date()),
          status: AppointmentStatus.PENDING_CONFIRMATION,
        },
      ],
      relations: ['serviceOption'],
      order: { startTime: 'ASC' },
    });
  }

  async findTodayAppointments(userId: string): Promise<Appointment[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.appointmentRepository.find({
      where: {
        userId,
        startTime: Between(today, tomorrow),
      },
      relations: ['serviceOption'],
      order: { startTime: 'ASC' },
    });
  }

  async findPendingConfirmation(userId: string): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: {
        userId,
        status: AppointmentStatus.PENDING_CONFIRMATION,
        startTime: MoreThanOrEqual(new Date()),
      },
      relations: ['serviceOption'],
      order: { startTime: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id, userId },
      relations: ['serviceOption'],
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async findByConfirmationToken(token: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { confirmationToken: token },
      relations: ['serviceOption', 'user'],
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async confirmAppointment(token: string): Promise<Appointment> {
    const appointment = await this.findByConfirmationToken(token);

    if (appointment.status !== AppointmentStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(
        'This appointment cannot be confirmed',
      );
    }

    // Check if past confirmation deadline
    const settings = await this.settingsService.findByUserId(appointment.userId);
    const deadline = new Date(appointment.startTime);
    deadline.setHours(
      deadline.getHours() - settings.confirmationDeadlineHours,
    );

    if (new Date() > deadline) {
      throw new BadRequestException(
        'The confirmation deadline has passed',
      );
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    appointment.confirmedAt = new Date();
    return this.appointmentRepository.save(appointment);
  }

  async confirmByToken(token: string): Promise<Appointment> {
    return this.confirmAppointment(token);
  }

  async createFromPublic(
    userId: string,
    createDto: CreateAppointmentDto,
    organizationId?: string,
  ): Promise<Appointment> {
    // Get service option
    const serviceOption = await this.serviceOptionsService.findById(
      createDto.serviceOptionId,
    );

    // Validate the slot is available
    const startTime = new Date(createDto.startTime);
    const endTime = createDto.endTime 
      ? new Date(createDto.endTime)
      : new Date(startTime.getTime() + serviceOption.duration * 60000);

    // Create or find client by phone number (clients belong to organization)
    let clientId: string | undefined;
    if (createDto.clientPhone && organizationId) {
      const client = await this.clientsService.findOrCreate(
        organizationId,
        createDto.clientPhone,
        createDto.clientName,
        createDto.clientEmail,
      );
      // Increment appointment count for client
      await this.clientsService.incrementAppointmentCount(client.id, organizationId);
      clientId = client.id;
    }

    // Create appointment
    const confirmationToken = uuidv4();
    const appointment = this.appointmentRepository.create({
      ...createDto,
      startTime,
      endTime,
      userId,
      clientId,
      confirmationToken,
      status: AppointmentStatus.PENDING_CONFIRMATION,
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Award booking points if gamification is enabled
    if (clientId) {
      try {
        await this.gamificationService.awardBookingPoints(clientId, userId, savedAppointment.id);
        
        // Process referral code if provided
        if ((createDto as any).referralCode) {
          await this.gamificationService.processReferral(
            (createDto as any).referralCode,
            clientId,
            userId,
          );
        }
      } catch (error) {
        // Log but don't fail the booking if gamification fails
        console.error('Gamification error:', error);
      }
    }

    return { ...savedAppointment, clientId } as Appointment;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateAppointmentDto,
    organizationId?: string,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);
    const previousStatus = appointment.status;
    Object.assign(appointment, updateDto);
    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Update client stats if status changed to completed, cancelled, or no_show
    // Use clientId from appointment directly - client is already linked
    if (
      updateDto.status &&
      updateDto.status !== previousStatus &&
      appointment.clientId &&
      organizationId
    ) {
      try {
        if (updateDto.status === AppointmentStatus.COMPLETED) {
          await this.clientsService.updateAppointmentStats(
            appointment.clientId,
            organizationId,
            'completed',
          );
          // Award completion points for gamification
          try {
            await this.gamificationService.awardCompletionPoints(appointment.clientId, userId, savedAppointment.id);
          } catch (error) {
            console.error('Gamification completion points error:', error);
          }
        } else if (updateDto.status === AppointmentStatus.CANCELLED) {
          await this.clientsService.updateAppointmentStats(
            appointment.clientId,
            organizationId,
            'cancelled',
          );
        } else if (updateDto.status === AppointmentStatus.NO_SHOW) {
          await this.clientsService.updateAppointmentStats(
            appointment.clientId,
            organizationId,
            'no_show',
          );
          // Reset streak on no-show
          try {
            await this.gamificationService.updateStreak(appointment.clientId, userId, false);
          } catch (error) {
            console.error('Gamification streak reset error:', error);
          }
        }
      } catch (error) {
        console.error('Failed to update client stats:', error);
      }
    }

    return savedAppointment;
  }

  async cancel(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);
    appointment.status = AppointmentStatus.CANCELLED;
    return this.appointmentRepository.save(appointment);
  }

  async confirmFromDashboard(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);

    if (appointment.status !== AppointmentStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(
        'This appointment cannot be confirmed',
      );
    }

    appointment.status = AppointmentStatus.CONFIRMED;
    appointment.confirmedAt = new Date();
    return this.appointmentRepository.save(appointment);
  }

  async getAvailableSlots(
    userId: string,
    serviceOptionId: string,
    date: string,
  ): Promise<TimeSlot[]> {
    const serviceOption = await this.serviceOptionsService.findById(serviceOptionId);
    const settings = await this.settingsService.findByUserId(userId);

    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check min/max advance booking
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + settings.minAdvanceBookingHours);
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + settings.maxAdvanceBookingDays);

    if (requestedDate < today || requestedDate > maxDate) {
      return [];
    }

    // Get day of week (0 = Monday in our system)
    const dayOfWeek = (requestedDate.getDay() + 6) % 7 as DayOfWeek;

    // Get availability for this day
    const availabilities = await this.availabilityService.findByUserAndDay(
      userId,
      dayOfWeek,
      serviceOptionId,
    );

    if (availabilities.length === 0) {
      return [];
    }

    // Get blocked times for this date
    const blockedTimes = await this.blockedTimesService.findByUserAndDate(
      userId,
      date,
    );

    // Check for full day block
    if (blockedTimes.some((bt) => bt.isFullDay)) {
      return [];
    }

    // Get existing appointments for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await this.appointmentRepository.find({
      where: {
        userId,
        startTime: Between(startOfDay, endOfDay),
        status: AppointmentStatus.CONFIRMED,
      },
    });

    // Check max appointments per day
    if (existingAppointments.length >= settings.maxAppointmentsPerDay) {
      return [];
    }

    // Generate time slots
    const slots: TimeSlot[] = [];
    const duration = serviceOption.duration;
    const buffer = settings.bufferTimeMinutes;

    for (const availability of availabilities) {
      const [startHour, startMin] = availability.startTime.split(':').map(Number);
      const [endHour, endMin] = availability.endTime.split(':').map(Number);

      let slotStart = new Date(date);
      slotStart.setHours(startHour, startMin, 0, 0);

      const availabilityEnd = new Date(date);
      availabilityEnd.setHours(endHour, endMin, 0, 0);

      while (slotStart.getTime() + duration * 60000 <= availabilityEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);

        // Check if slot is in the past or before min advance booking
        if (slotStart > minDate) {
          // Check if slot is blocked
          const isBlocked = blockedTimes.some((bt) => {
            if (bt.isFullDay) return true;
            const blockStart = new Date(date);
            const [bsH, bsM] = bt.startTime.split(':').map(Number);
            blockStart.setHours(bsH, bsM, 0, 0);
            const blockEnd = new Date(date);
            const [beH, beM] = bt.endTime.split(':').map(Number);
            blockEnd.setHours(beH, beM, 0, 0);
            return slotStart < blockEnd && slotEnd > blockStart;
          });

          // Check if slot overlaps with existing appointments
          const isBooked = existingAppointments.some((apt) => {
            const aptStart = new Date(apt.startTime);
            const aptEnd = new Date(apt.endTime);
            // Add buffer time
            aptStart.setMinutes(aptStart.getMinutes() - buffer);
            aptEnd.setMinutes(aptEnd.getMinutes() + buffer);
            return slotStart < aptEnd && slotEnd > aptStart;
          });

          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            available: !isBlocked && !isBooked,
          });
        }

        // Move to next slot
        slotStart = new Date(slotStart.getTime() + (duration + buffer) * 60000);
      }
    }

    return slots.filter((slot) => slot.available);
  }

  private async isSlotAvailable(
    userId: string,
    serviceOptionId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<boolean> {
    const date = startTime.toISOString().split('T')[0];
    const slots = await this.getAvailableSlots(
      userId,
      serviceOptionId,
      date,
    );
    return slots.some(
      (slot) =>
        new Date(slot.startTime).getTime() === startTime.getTime() &&
        slot.available,
    );
  }

  async getDashboardStats(userId: string): Promise<{
    todayAppointments: number;
    pendingConfirmations: number;
    upcomingAppointments: number;
    noShowRate: number;
    fillRate: number;
  }> {
    const today = await this.findTodayAppointments(userId);
    const pending = await this.findPendingConfirmation(userId);
    const upcoming = await this.findUpcoming(userId);

    // Calculate no-show rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastAppointments = await this.appointmentRepository.find({
      where: {
        userId,
        startTime: Between(thirtyDaysAgo, new Date()),
      },
    });

    const noShows = pastAppointments.filter(
      (a) => a.status === AppointmentStatus.NO_SHOW,
    ).length;
    const completed = pastAppointments.filter(
      (a) =>
        a.status === AppointmentStatus.COMPLETED ||
        a.status === AppointmentStatus.CONFIRMED,
    ).length;

    const noShowRate =
      pastAppointments.length > 0
        ? (noShows / pastAppointments.length) * 100
        : 0;
    const fillRate =
      pastAppointments.length > 0
        ? (completed / pastAppointments.length) * 100
        : 0;

    return {
      todayAppointments: today.length,
      pendingConfirmations: pending.length,
      upcomingAppointments: upcoming.length,
      noShowRate: Math.round(noShowRate * 10) / 10,
      fillRate: Math.round(fillRate * 10) / 10,
    };
  }

  async processUnconfirmedAppointments(): Promise<void> {
    // Find all pending appointments past their confirmation deadline
    const appointments = await this.appointmentRepository.find({
      where: {
        status: AppointmentStatus.PENDING_CONFIRMATION,
      },
      relations: ['user', 'user.settings'],
    });

    for (const appointment of appointments) {
      const settings = appointment.user.settings;
      if (!settings?.autoCancelUnconfirmed) continue;

      const deadline = new Date(appointment.startTime);
      deadline.setHours(
        deadline.getHours() - settings.confirmationDeadlineHours,
      );

      if (new Date() > deadline) {
        appointment.status = AppointmentStatus.CANCELLED;
        await this.appointmentRepository.save(appointment);
      }
    }
  }

  // ==================== Organization-based Public Booking ====================

  /**
   * Get available time slots for an organization-based booking
   * Aggregates availability from all providers assigned to the service
   */
  async getAvailableSlotsForOrganization(
    organizationId: string,
    serviceOptionId: string,
    date: string,
    providerId?: string,
  ): Promise<TimeSlot[]> {
    const serviceOption = await this.serviceOptionsService.findById(serviceOptionId);
    const settings = await this.organizationSettingsService.findByOrganizationId(organizationId);

    const requestedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check min/max advance booking
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + settings.minAdvanceBookingHours);
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + settings.maxAdvanceBookingDays);

    if (requestedDate < today || requestedDate > maxDate) {
      return [];
    }

    // Get day of week (0 = Monday in our system)
    const dayOfWeek = (requestedDate.getDay() + 6) % 7 as DayOfWeek;

    // Get providers assigned to this service
    const providers = await this.userServiceOptionsService.getProvidersForService(
      serviceOptionId,
      organizationId,
    );

    if (providers.length === 0) {
      return [];
    }

    // Filter to specific provider if requested
    const providerIds = providerId 
      ? providers.filter(p => p.id === providerId).map(p => p.id)
      : providers.map(p => p.id);

    if (providerIds.length === 0) {
      return [];
    }

    // Aggregate availability from all providers
    const allSlots: Map<string, TimeSlot> = new Map();
    const duration = serviceOption.duration;
    const buffer = settings.bufferTimeMinutes;

    for (const providerUserId of providerIds) {
      // Get availability for this provider on this day
      const availabilities = await this.availabilityService.findByUserAndDay(
        providerUserId,
        dayOfWeek,
        serviceOptionId,
      );

      if (availabilities.length === 0) continue;

      // Get blocked times for this provider
      const blockedTimes = await this.blockedTimesService.findByUserAndDate(
        providerUserId,
        date,
      );

      // Skip if full day is blocked
      if (blockedTimes.some((bt) => bt.isFullDay)) continue;

      // Get existing appointments for this provider
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await this.appointmentRepository.find({
        where: {
          userId: providerUserId,
          startTime: Between(startOfDay, endOfDay),
          status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION]),
        },
      });

      // Generate time slots for this provider
      for (const availability of availabilities) {
        const [startHour, startMin] = availability.startTime.split(':').map(Number);
        const [endHour, endMin] = availability.endTime.split(':').map(Number);

        let slotStart = new Date(date);
        slotStart.setHours(startHour, startMin, 0, 0);

        const availabilityEnd = new Date(date);
        availabilityEnd.setHours(endHour, endMin, 0, 0);

        while (slotStart.getTime() + duration * 60000 <= availabilityEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);
          const slotKey = slotStart.toISOString();

          // Check if slot is in the past or before min advance booking
          if (slotStart > minDate) {
            // Check if slot is blocked
            const isBlocked = blockedTimes.some((bt) => {
              if (bt.isFullDay) return true;
              const blockStart = new Date(date);
              const [bsH, bsM] = bt.startTime.split(':').map(Number);
              blockStart.setHours(bsH, bsM, 0, 0);
              const blockEnd = new Date(date);
              const [beH, beM] = bt.endTime.split(':').map(Number);
              blockEnd.setHours(beH, beM, 0, 0);
              return slotStart < blockEnd && slotEnd > blockStart;
            });

            // Check if slot overlaps with existing appointments
            const isBooked = existingAppointments.some((apt) => {
              const aptStart = new Date(apt.startTime);
              const aptEnd = new Date(apt.endTime);
              // Add buffer time
              const aptEndWithBuffer = new Date(aptEnd.getTime() + buffer * 60000);
              return slotStart < aptEndWithBuffer && slotEnd > aptStart;
            });

            if (!isBlocked && !isBooked) {
              // Add or update slot (available if any provider has it)
              if (!allSlots.has(slotKey)) {
                allSlots.set(slotKey, {
                  startTime: slotStart.toISOString(),
                  endTime: slotEnd.toISOString(),
                  available: true,
                });
              }
            }
          }

          // Move to next slot
          slotStart = new Date(slotStart.getTime() + (duration + buffer) * 60000);
        }
      }
    }

    // Convert to array and sort
    return Array.from(allSlots.values()).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  /**
   * Get dates with available slots for a given month
   * Returns array of date strings (YYYY-MM-DD) that have at least one available slot
   */
  async getAvailableDatesForOrganization(
    organizationId: string,
    serviceOptionId: string,
    month: string,
    providerId?: string,
  ): Promise<string[]> {
    const settings = await this.organizationSettingsService.findByOrganizationId(organizationId);
    
    // Parse month to get start and end dates
    const [year, monthNum] = month.split('-').map(Number);
    const startOfMonth = new Date(year, monthNum - 1, 1);
    const endOfMonth = new Date(year, monthNum, 0); // Last day of month
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + settings.minAdvanceBookingHours);
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + settings.maxAdvanceBookingDays);
    
    const availableDates: string[] = [];
    
    // Iterate through each day of the month
    const currentDate = new Date(Math.max(startOfMonth.getTime(), today.getTime()));
    
    while (currentDate <= endOfMonth && currentDate <= maxDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Check if this date has any available slots
      const slots = await this.getAvailableSlotsForOrganization(
        organizationId,
        serviceOptionId,
        dateStr,
        providerId,
      );
      
      if (slots.length > 0) {
        availableDates.push(dateStr);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return availableDates;
  }

  /**
   * Create an appointment from public booking (organization-based)
   */
  async createFromPublicOrganization(
    organizationId: string,
    createDto: CreateAppointmentDto,
  ): Promise<Appointment> {
    // Get service option
    const serviceOption = await this.serviceOptionsService.findById(
      createDto.serviceOptionId,
    );

    // Validate the slot is available
    const startTime = new Date(createDto.startTime);
    const endTime = createDto.endTime 
      ? new Date(createDto.endTime)
      : new Date(startTime.getTime() + serviceOption.duration * 60000);

    // Get providers assigned to this service
    const providers = await this.userServiceOptionsService.getProvidersForService(
      createDto.serviceOptionId,
      organizationId,
    );

    if (providers.length === 0) {
      throw new BadRequestException('No providers available for this service');
    }

    // Find an available provider for this slot
    // TODO: If providerId is specified in DTO, use that provider
    let assignedUserId: string | null = null;
    const settings = await this.organizationSettingsService.findByOrganizationId(organizationId);
    const buffer = settings.bufferTimeMinutes;

    const dateStr = startTime.toISOString().split('T')[0];
    const dayOfWeek = (startTime.getDay() + 6) % 7 as DayOfWeek;

    for (const provider of providers) {
      const providerUserId = provider.id;

      // Check availability
      const availabilities = await this.availabilityService.findByUserAndDay(
        providerUserId,
        dayOfWeek,
        createDto.serviceOptionId,
      );

      const hasAvailability = availabilities.some((av) => {
        const [avStartH, avStartM] = av.startTime.split(':').map(Number);
        const [avEndH, avEndM] = av.endTime.split(':').map(Number);
        const avStart = new Date(dateStr);
        avStart.setHours(avStartH, avStartM, 0, 0);
        const avEnd = new Date(dateStr);
        avEnd.setHours(avEndH, avEndM, 0, 0);
        return startTime >= avStart && endTime <= avEnd;
      });

      if (!hasAvailability) continue;

      // Check blocked times
      const blockedTimes = await this.blockedTimesService.findByUserAndDate(
        providerUserId,
        dateStr,
      );

      const isBlocked = blockedTimes.some((bt) => {
        if (bt.isFullDay) return true;
        const blockStart = new Date(dateStr);
        const [bsH, bsM] = bt.startTime.split(':').map(Number);
        blockStart.setHours(bsH, bsM, 0, 0);
        const blockEnd = new Date(dateStr);
        const [beH, beM] = bt.endTime.split(':').map(Number);
        blockEnd.setHours(beH, beM, 0, 0);
        return startTime < blockEnd && endTime > blockStart;
      });

      if (isBlocked) continue;

      // Check existing appointments
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await this.appointmentRepository.find({
        where: {
          userId: providerUserId,
          startTime: Between(startOfDay, endOfDay),
          status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION]),
        },
      });

      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        const aptEndWithBuffer = new Date(aptEnd.getTime() + buffer * 60000);
        return startTime < aptEndWithBuffer && endTime > aptStart;
      });

      if (!hasConflict) {
        assignedUserId = providerUserId;
        break;
      }
    }

    if (!assignedUserId) {
      throw new BadRequestException('This time slot is no longer available');
    }

    // Create or find client by phone number (clients belong to organization)
    let clientId: string | undefined;
    if (createDto.clientPhone) {
      const client = await this.clientsService.findOrCreate(
        organizationId,
        createDto.clientPhone,
        createDto.clientName,
        createDto.clientEmail,
      );
      await this.clientsService.incrementAppointmentCount(client.id, organizationId);
      clientId = client.id;
    }

    // Create appointment
    const confirmationToken = uuidv4();
    const appointment = this.appointmentRepository.create({
      ...createDto,
      startTime,
      endTime,
      userId: assignedUserId,
      clientId,
      confirmationToken,
      status: AppointmentStatus.PENDING_CONFIRMATION,
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Award booking points if gamification is enabled
    if (clientId) {
      try {
        await this.gamificationService.awardBookingPoints(clientId, assignedUserId, savedAppointment.id);
      } catch (error) {
        // Don't fail the booking if gamification fails
        console.error('Failed to award booking points:', error);
      }
    }

    return this.appointmentRepository.findOneOrFail({
      where: { id: savedAppointment.id },
      relations: ['serviceOption'],
    });
  }

  /**
   * Create an appointment from dashboard (authenticated user)
   */
  async createFromDashboard(
    userId: string,
    createDto: CreateAppointmentDto,
    organizationId?: string,
  ): Promise<Appointment> {
    // Get service option
    const serviceOption = await this.serviceOptionsService.findById(
      createDto.serviceOptionId,
    );

    // Calculate times
    const startTime = new Date(createDto.startTime);
    const endTime = createDto.endTime 
      ? new Date(createDto.endTime)
      : new Date(startTime.getTime() + serviceOption.duration * 60000);

    // Create or find client by phone number (clients belong to organization)
    let clientId: string | undefined;
    if (createDto.clientPhone && organizationId) {
      const client = await this.clientsService.findOrCreate(
        organizationId,
        createDto.clientPhone,
        createDto.clientName,
        createDto.clientEmail,
      );
      await this.clientsService.incrementAppointmentCount(client.id, organizationId);
      clientId = client.id;
    }

    // Create appointment - dashboard appointments are confirmed by default
    const confirmationToken = uuidv4();
    const appointment = this.appointmentRepository.create({
      ...createDto,
      startTime,
      endTime,
      userId,
      clientId,
      confirmationToken,
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Award booking points if gamification is enabled
    if (clientId) {
      try {
        await this.gamificationService.awardBookingPoints(clientId, userId, savedAppointment.id);
      } catch (error) {
        console.error('Failed to award booking points:', error);
      }
    }

    return this.appointmentRepository.findOneOrFail({
      where: { id: savedAppointment.id },
      relations: ['serviceOption'],
    });
  }
}
