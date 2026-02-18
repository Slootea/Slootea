import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThan, Like, ILike, LessThanOrEqual, In } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  AppointmentQueryDto,
  PaginatedResult,
  NextAvailableResult,
  AvailabilityCheckResult,
} from './dto/appointment.dto';
import { ServiceOptionsService } from '../service-options/service-options.service';
import { AvailabilityService } from '../availability/availability.service';
import { BlockedTimesService } from '../blocked-times/blocked-times.service';
import { OrganizationSettingsService } from '../settings/organization-settings.service';
import { BookingLinksService } from '../booking-links/booking-links.service';
import { ClientsService } from '../clients/clients.service';
import { UserServiceOptionsService } from '../service-options/user-service-options.service';
import { NotificationService, NotificationData } from '../messaging/notification.service';
import { DayOfWeek } from '../availability/entities/availability.entity';
import { v4 as uuidv4 } from 'uuid';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

/**
 * Helper function to format a Date to YYYY-MM-DD string in a specific timezone
 */
function formatDateInTimezone(date: Date, timezone: string = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    // Fallback to UTC if timezone is invalid
    return date.toISOString().split('T')[0];
  }
}

/**
 * Helper function to get the day of week (0 = Monday) in a specific timezone
 */
function getDayOfWeekInTimezone(date: Date, timezone: string = 'UTC'): DayOfWeek {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const dayName = formatter.format(date);
    const dayMap: Record<string, DayOfWeek> = {
      'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6
    };
    return dayMap[dayName] ?? ((date.getDay() + 6) % 7) as DayOfWeek;
  } catch {
    return ((date.getDay() + 6) % 7) as DayOfWeek;
  }
}

/**
 * Helper function to create a Date object for a specific time in a timezone
 * Returns the Date in UTC that corresponds to the given local time in the timezone
 * 
 * For example, if dateStr="2026-02-04", time="09:00", timezone="Europe/Istanbul" (UTC+3),
 * this returns a Date representing 06:00 UTC (which is 09:00 in Istanbul)
 */
function createDateInTimezone(dateStr: string, time: string, timezone: string = 'UTC'): Date {
  // Parse the time
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // For UTC, just create the date directly
  if (timezone === 'UTC') {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  }
  
  try {
    // Create a formatter that outputs in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    // We need to find a UTC time that, when displayed in the target timezone,
    // shows the desired local time. We do this by binary search / iteration.
    
    // Start with an initial guess: treat the input as UTC
    let guess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    
    // Format the guess in the target timezone
    const parts = formatter.formatToParts(guess);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
    
    const guessHourInTz = getPart('hour');
    const guessMinuteInTz = getPart('minute');
    const guessDayInTz = getPart('day');
    
    // Calculate how far off we are
    let hourDiff = guessHourInTz - hours;
    let dayDiff = guessDayInTz - day;
    
    // Handle day wraparound
    if (dayDiff > 15) dayDiff -= 30; // Month boundary
    if (dayDiff < -15) dayDiff += 30;
    
    // Total offset in minutes
    const offsetMinutes = dayDiff * 24 * 60 + hourDiff * 60 + (guessMinuteInTz - minutes);
    
    // Adjust our guess by subtracting the offset
    const result = new Date(guess.getTime() - offsetMinutes * 60000);
    
    return result;
  } catch (e) {
    console.error('createDateInTimezone error:', e);
    // Fallback: parse as local time (server timezone)
    return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  }
}

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly serviceOptionsService: ServiceOptionsService,
    private readonly availabilityService: AvailabilityService,
    private readonly blockedTimesService: BlockedTimesService,
    private readonly organizationSettingsService: OrganizationSettingsService,
    private readonly bookingLinksService: BookingLinksService,
    @Inject(forwardRef(() => ClientsService))
    private readonly clientsService: ClientsService,
    @Inject(forwardRef(() => UserServiceOptionsService))
    private readonly userServiceOptionsService: UserServiceOptionsService,
    private readonly notificationService: NotificationService,
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

    // Get organization settings via the user's organization
    // First get the user to find their organizationId
    const user = await this.appointmentRepository.manager.findOne('User', { where: { id: appointment.userId } }) as { organizationId: string } | null;
    if (!user?.organizationId) {
      throw new BadRequestException('Cannot find organization settings');
    }
    
    const settings = await this.organizationSettingsService.findByOrganizationId(user.organizationId);
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
    const previousStartTime = appointment.startTime;
    let timeWasUpdated = false;
    
    // If startTime is being updated, recalculate endTime based on service duration
    if (updateDto.startTime) {
      const newStartTime = new Date(updateDto.startTime);
      // Get service duration from the service option
      const serviceOption = await this.serviceOptionsService.findById(appointment.serviceOptionId);
      const duration = serviceOption.duration; // in minutes
      const newEndTime = new Date(newStartTime.getTime() + duration * 60000);
      
      // Check if time actually changed
      if (previousStartTime.getTime() !== newStartTime.getTime()) {
        timeWasUpdated = true;
      }
      
      appointment.startTime = newStartTime;
      appointment.endTime = newEndTime;
      // Remove startTime from updateDto to avoid double assignment
      delete updateDto.startTime;
    }

    // Extract sendNotification flag before Object.assign (default to true)
    const shouldSendNotification = updateDto.sendNotification !== false;
    delete updateDto.sendNotification;
    
    Object.assign(appointment, updateDto);
    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Send reschedule notification if time was updated and notification is enabled
    if (timeWasUpdated && shouldSendNotification && organizationId && (appointment.clientPhone || appointment.clientEmail)) {
      try {
        const fullAppointment = await this.appointmentRepository.findOne({
          where: { id: savedAppointment.id },
          relations: ['serviceOption', 'user'],
        });

        if (fullAppointment) {
          const notificationData: NotificationData = {
            organizationId,
            clientName: fullAppointment.clientName,
            clientPhone: fullAppointment.clientPhone || undefined,
            clientEmail: fullAppointment.clientEmail || undefined,
            serviceName: fullAppointment.serviceOption?.title || 'Appointment',
            appointmentDate: fullAppointment.startTime,
          };

          const result = await this.notificationService.sendAppointmentRescheduledNotification(notificationData);
          if (result.anySent) {
            this.logger.log(`Reschedule notification sent for appointment ${savedAppointment.id}`);
          } else {
            this.logger.debug(`No reschedule notification sent for appointment ${savedAppointment.id} - no channels configured`);
          }
        }
      } catch (notificationError) {
        this.logger.error(`Failed to send reschedule notification`, notificationError);
      }
    }

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
        } else if (updateDto.status === AppointmentStatus.CANCELLED) {
          await this.clientsService.updateAppointmentStats(
            appointment.clientId,
            organizationId,
            'cancelled',
          );
          
          // Send cancellation notification to all channels (respecting sendNotification flag)
          if (shouldSendNotification && (appointment.clientPhone || appointment.clientEmail)) {
            try {
              const fullAppointment = await this.appointmentRepository.findOne({
                where: { id: savedAppointment.id },
                relations: ['serviceOption'],
              });

              if (fullAppointment) {
                const notificationData: NotificationData = {
                  organizationId,
                  clientName: fullAppointment.clientName,
                  clientPhone: fullAppointment.clientPhone || undefined,
                  clientEmail: fullAppointment.clientEmail || undefined,
                  serviceName: fullAppointment.serviceOption?.title || 'Appointment',
                  appointmentDate: fullAppointment.startTime,
                };

                const result = await this.notificationService.sendAppointmentCanceledNotification(notificationData);
                if (result.anySent) {
                  this.logger.log(`Cancellation notification sent for appointment ${savedAppointment.id}`);
                }
              }
            } catch (notificationError) {
              this.logger.error(`Failed to send cancellation notification`, notificationError);
            }
          }
        } else if (updateDto.status === AppointmentStatus.NO_SHOW) {
          await this.clientsService.updateAppointmentStats(
            appointment.clientId,
            organizationId,
            'no_show',
          );
        }
      } catch (error) {
        console.error('Failed to update client stats:', error);
      }
    }

    return savedAppointment;
  }

  async cancel(id: string, userId: string, organizationId?: string): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);
    const previousStatus = appointment.status;
    appointment.status = AppointmentStatus.CANCELLED;
    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Send cancellation notification if status changed and client has contact info
    if (
      previousStatus !== AppointmentStatus.CANCELLED &&
      (appointment.clientPhone || appointment.clientEmail) &&
      organizationId
    ) {
      try {
        const fullAppointment = await this.appointmentRepository.findOne({
          where: { id: savedAppointment.id },
          relations: ['serviceOption', 'user'],
        });

        if (fullAppointment) {
          const notificationData: NotificationData = {
            organizationId,
            clientName: fullAppointment.clientName,
            clientPhone: fullAppointment.clientPhone || undefined,
            clientEmail: fullAppointment.clientEmail || undefined,
            serviceName: fullAppointment.serviceOption?.title || 'Appointment',
            appointmentDate: fullAppointment.startTime,
          };

          const result = await this.notificationService.sendAppointmentCanceledNotification(notificationData);
          if (result.anySent) {
            this.logger.log(`Cancellation notification sent for appointment ${id}`);
          } else {
            this.logger.debug(`No cancellation notification sent for appointment ${id} - no channels configured`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to send cancellation notification for appointment ${id}`, error);
      }
    }

    return savedAppointment;
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

  async completeFromDashboard(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        'Only confirmed appointments can be marked as completed',
      );
    }

    appointment.status = AppointmentStatus.COMPLETED;
    return this.appointmentRepository.save(appointment);
  }

  async getAvailableSlots(
    userId: string,
    serviceOptionId: string,
    date: string,
    organizationId?: string,
  ): Promise<TimeSlot[]> {
    const serviceOption = await this.serviceOptionsService.findById(serviceOptionId);
    
    // Get organization settings
    let orgId = organizationId;
    if (!orgId) {
      const user = await this.appointmentRepository.manager.findOne('User', { where: { id: userId } }) as { organizationId: string } | null;
      orgId = user?.organizationId;
    }
    if (!orgId) {
      return []; // No organization, can't get settings
    }
    const settings = await this.organizationSettingsService.findByOrganizationId(orgId);

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

          // Check if slot overlaps with existing appointments (considering buffer before AND after)
          const isBooked = existingAppointments.some((apt) => {
            const aptStart = new Date(apt.startTime);
            const aptEnd = new Date(apt.endTime);
            // Buffer zone extends both before the appointment starts and after it ends
            const aptStartWithBufferBefore = new Date(aptStart.getTime() - buffer * 60000);
            const aptEndWithBufferAfter = new Date(aptEnd.getTime() + buffer * 60000);
            const slotEndWithBuffer = new Date(slotEnd.getTime() + buffer * 60000);
            return slotStart < aptEndWithBufferAfter && slotEndWithBuffer > aptStartWithBufferBefore;
          });

          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            available: !isBlocked && !isBooked,
          });
        }

        // Move to next slot - use 15 minute increments to catch gaps between appointments
        // (e.g., when an appointment in between was cancelled)
        const SLOT_INCREMENT_MINUTES = 15;
        slotStart = new Date(slotStart.getTime() + SLOT_INCREMENT_MINUTES * 60000);
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

  /**
   * Cron job to auto-cancel pending appointments that have passed their confirmation deadline.
   * Runs every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processUnconfirmedAppointments(): Promise<void> {
    this.logger.debug('Processing unconfirmed appointments for auto-cancellation...');
    
    // Find all pending appointments
    const appointments = await this.appointmentRepository.find({
      where: {
        status: AppointmentStatus.PENDING_CONFIRMATION,
      },
      relations: ['user'],
    });

    if (appointments.length === 0) {
      this.logger.debug('No pending appointments found');
      return;
    }

    // Group appointments by organization
    const appointmentsByOrg = new Map<string, Appointment[]>();
    for (const appointment of appointments) {
      const orgId = appointment.serviceOption?.organizationId;
      if (!orgId) continue;
      
      if (!appointmentsByOrg.has(orgId)) {
        appointmentsByOrg.set(orgId, []);
      }
      appointmentsByOrg.get(orgId)!.push(appointment);
    }

    // Process each organization's appointments
    for (const [orgId, orgAppointments] of appointmentsByOrg) {
      try {
        const settings = await this.organizationSettingsService.findByOrganizationId(orgId);
        
        // Skip if auto-cancel is not enabled
        if (!settings.autoCancelUnconfirmed) continue;

        for (const appointment of orgAppointments) {
          const deadline = new Date(appointment.startTime);
          deadline.setHours(
            deadline.getHours() - settings.confirmationDeadlineHours,
          );

          if (new Date() > deadline) {
            appointment.status = AppointmentStatus.CANCELLED;
            await this.appointmentRepository.save(appointment);
            this.logger.log(`Auto-cancelled appointment ${appointment.id} for org ${orgId} (past deadline)`);
          }
        }
      } catch (error) {
        this.logger.error(`Error processing pending appointments for org ${orgId}`, error);
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
    const timezone = (settings as any).timezone || 'UTC';

    const requestedDate = new Date(date + 'T12:00:00Z'); // Use noon to avoid timezone edge cases
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

    // Get day of week using timezone-aware function
    const dayOfWeek = getDayOfWeekInTimezone(requestedDate, timezone);

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

      // Get existing appointments for this provider in the organization's timezone
      const dayStartInTz = createDateInTimezone(date, '00:00', timezone);
      const dayEndInTz = createDateInTimezone(date, '23:59', timezone);

      const existingAppointments = await this.appointmentRepository.find({
        where: {
          userId: providerUserId,
          startTime: Between(dayStartInTz, dayEndInTz),
          status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION]),
        },
      });

      // Generate time slots for this provider
      for (const availability of availabilities) {
        // Create slot times using the organization's timezone
        let slotStart = createDateInTimezone(date, availability.startTime, timezone);
        const availabilityEnd = createDateInTimezone(date, availability.endTime, timezone);

        while (slotStart.getTime() + duration * 60000 <= availabilityEnd.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + duration * 60000);
          const slotKey = slotStart.toISOString();

          // Check if slot is in the past or before min advance booking
          if (slotStart > minDate) {
            // Check if slot is blocked
            const isBlocked = blockedTimes.some((bt) => {
              if (bt.isFullDay) return true;
              const blockStart = createDateInTimezone(date, bt.startTime, timezone);
              const blockEnd = createDateInTimezone(date, bt.endTime, timezone);
              return slotStart < blockEnd && slotEnd > blockStart;
            });

            // Check if slot overlaps with existing appointments (considering buffer time before AND after)
            // For a slot to be available, there must be no overlap between
            // [slotStart, slotEnd+buffer] and [aptStart-buffer, aptEnd+buffer]
            const isBooked = existingAppointments.some((apt) => {
              const aptStart = new Date(apt.startTime);
              const aptEnd = new Date(apt.endTime);
              // Buffer zone extends both before the appointment starts and after it ends
              const aptStartWithBufferBefore = new Date(aptStart.getTime() - buffer * 60000);
              const aptEndWithBufferAfter = new Date(aptEnd.getTime() + buffer * 60000);
              const slotEndWithBuffer = new Date(slotEnd.getTime() + buffer * 60000);
              return slotStart < aptEndWithBufferAfter && slotEndWithBuffer > aptStartWithBufferBefore;
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

          // Move to next slot - use 15 minute increments to catch gaps between appointments
          // (e.g., when an appointment in between was cancelled)
          const SLOT_INCREMENT_MINUTES = 15;
          slotStart = new Date(slotStart.getTime() + SLOT_INCREMENT_MINUTES * 60000);
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
    const timezone = (settings as any).timezone || 'UTC';
    
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
      // Use timezone-aware date formatting
      const dateStr = formatDateInTimezone(currentDate, timezone);
      
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

    // Find all available providers for this slot, then pick the one with least appointments (load balancing)
    const settings = await this.organizationSettingsService.findByOrganizationId(organizationId);
    const buffer = settings.bufferTimeMinutes;
    const timezone = (settings as any).timezone || 'UTC';

    const dateStr = formatDateInTimezone(startTime, timezone);
    const dayOfWeek = getDayOfWeekInTimezone(startTime, timezone);
    const dayStartInTz = createDateInTimezone(dateStr, '00:00', timezone);
    const dayEndInTz = createDateInTimezone(dateStr, '23:59', timezone);

    // Collect all available providers with their appointment counts
    const availableProviders: Array<{ userId: string; appointmentCount: number }> = [];

    for (const provider of providers) {
      const providerUserId = provider.id;

      // Check availability
      const availabilities = await this.availabilityService.findByUserAndDay(
        providerUserId,
        dayOfWeek,
        createDto.serviceOptionId,
      );

      const hasAvailability = availabilities.some((av) => {
        const avStart = createDateInTimezone(dateStr, av.startTime, timezone);
        const avEnd = createDateInTimezone(dateStr, av.endTime, timezone);
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
        const blockStart = createDateInTimezone(dateStr, bt.startTime, timezone);
        const blockEnd = createDateInTimezone(dateStr, bt.endTime, timezone);
        return startTime < blockEnd && endTime > blockStart;
      });

      if (isBlocked) continue;

      // Get existing appointments for this provider
      const existingAppointments = await this.appointmentRepository.find({
        where: {
          userId: providerUserId,
          startTime: Between(dayStartInTz, dayEndInTz),
          status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION]),
        },
      });

      // Check if the specific slot has a conflict
      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        // Buffer zone extends both before the appointment starts and after it ends
        const aptStartWithBufferBefore = new Date(aptStart.getTime() - buffer * 60000);
        const aptEndWithBufferAfter = new Date(aptEnd.getTime() + buffer * 60000);
        const endTimeWithBuffer = new Date(endTime.getTime() + buffer * 60000);
        return startTime < aptEndWithBufferAfter && endTimeWithBuffer > aptStartWithBufferBefore;
      });

      if (!hasConflict) {
        // This provider is available - add with their appointment count for load balancing
        availableProviders.push({
          userId: providerUserId,
          appointmentCount: existingAppointments.length,
        });
      }
    }

    if (availableProviders.length === 0) {
      throw new BadRequestException('This time slot is no longer available');
    }

    // Pick the provider with the least appointments (load balancing)
    availableProviders.sort((a, b) => a.appointmentCount - b.appointmentCount);
    const assignedUserId = availableProviders[0].userId;

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

    // Determine appointment status based on auto-confirm setting
    const autoConfirm = settings.autoConfirmAppointments !== false; // Default to true
    const appointmentStatus = autoConfirm
      ? AppointmentStatus.CONFIRMED
      : AppointmentStatus.PENDING_CONFIRMATION;

    // Create appointment
    const confirmationToken = uuidv4();
    const appointment = this.appointmentRepository.create({
      ...createDto,
      startTime,
      endTime,
      userId: assignedUserId,
      clientId,
      confirmationToken,
      status: appointmentStatus,
      confirmedAt: autoConfirm ? new Date() : undefined,
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);

    const fullAppointment = await this.appointmentRepository.findOneOrFail({
      where: { id: savedAppointment.id },
      relations: ['serviceOption', 'user'],
    });

    // Send notification for appointment created to all channels
    if (createDto.clientPhone || createDto.clientEmail) {
      try {
        const providerUser = await this.userServiceOptionsService.getUserById(assignedUserId);
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const notificationData: NotificationData = {
          organizationId,
          clientName: createDto.clientName,
          clientPhone: createDto.clientPhone || undefined,
          clientEmail: createDto.clientEmail || undefined,
          serviceName: fullAppointment.serviceOption?.title || 'Appointment',
          appointmentDate: startTime,
          providerName: providerUser?.firstName
            ? `${providerUser.firstName} ${providerUser.lastName || ''}`.trim()
            : undefined,
          confirmationLink: `${baseUrl}/confirm/${confirmationToken}`,
          appointmentLink: `${baseUrl}/appointment/${confirmationToken}`,
        };

        const result = await this.notificationService.sendAppointmentCreatedNotification(notificationData);
        if (result.anySent) {
          this.logger.log(`Notification sent for appointment ${savedAppointment.id}`, {
            whatsapp: result.whatsapp?.success,
          });
        } else {
          this.logger.debug(`No notification sent for appointment ${savedAppointment.id} - no channels configured`);
        }
      } catch (error) {
        // Don't fail the appointment creation if notification fails
        this.logger.error(`Failed to send notification for appointment ${savedAppointment.id}`, error);
      }
    }

    return fullAppointment;
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

    await this.notificationService.sendAppointmentCreatedNotification({
      organizationId: organizationId || "",
      clientName: createDto.clientName,
      clientPhone: createDto.clientPhone || undefined,
      clientEmail: createDto.clientEmail || undefined,
      serviceName: serviceOption.title,
      appointmentDate: startTime,
    }).catch((error) => {
      this.logger.error(`Failed to send notification for appointment ${savedAppointment.id}`, error);
    });

    return this.appointmentRepository.findOneOrFail({
      where: { id: savedAppointment.id },
      relations: ['serviceOption'],
    });
  }

  /**
   * Get the next available time slot for a service/provider
   * Used by dashboard to auto-populate appointment time
   */
  async getNextAvailableTime(
    userId: string,
    serviceOptionId: string,
    providerId?: string,
    fromDate?: string,
    organizationId?: string,
  ): Promise<NextAvailableResult> {
    const serviceOption = await this.serviceOptionsService.findById(serviceOptionId);
    
    // Get settings based on context
    let orgId = organizationId;
    if (!orgId) {
      const user = await this.appointmentRepository.manager.findOne('User', { where: { id: userId } }) as { organizationId: string } | null;
      orgId = user?.organizationId;
    }
    if (!orgId) {
      return { available: false, nextSlot: null, message: 'Organization not found' };
    }
    const settings = await this.organizationSettingsService.findByOrganizationId(orgId);

    const searchStartDate = fromDate ? new Date(fromDate) : new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + settings.maxAdvanceBookingDays);

    // If provider is specified, search only that provider's slots
    // Otherwise, if in org context, search all providers for the service
    let targetUserIds: string[] = [];
    
    if (providerId) {
      // providerId is a Clerk ID, we need to convert to db user ID
      const targetUser = await this.userServiceOptionsService.getUserByClerkId(providerId);
      if (targetUser) {
        targetUserIds = [targetUser.id];
      }
    } else if (organizationId) {
      // Get all providers for this service in the organization
      const providers = await this.userServiceOptionsService.getProvidersForService(
        serviceOptionId,
        organizationId,
      );
      targetUserIds = providers.map(p => p.id);
    } else {
      // Individual user context
      targetUserIds = [userId];
    }

    if (targetUserIds.length === 0) {
      return {
        available: false,
        nextSlot: null,
        message: 'No providers available for this service',
      };
    }

    const duration = serviceOption.duration;
    const buffer = settings.bufferTimeMinutes;
    const timezone = (settings as any).timezone || 'UTC';
    const minAdvanceDate = new Date();
    minAdvanceDate.setHours(minAdvanceDate.getHours() + settings.minAdvanceBookingHours);

    // Search day by day until we find an available slot
    const currentDate = new Date(Math.max(searchStartDate.getTime(), minAdvanceDate.getTime()));
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= maxDate) {
      // Use timezone-aware date formatting
      const dateStr = formatDateInTimezone(currentDate, timezone);
      const dayOfWeek = getDayOfWeekInTimezone(currentDate, timezone);

      for (const targetUserId of targetUserIds) {
        // Get availability for this day
        const availabilities = await this.availabilityService.findByUserAndDay(
          targetUserId,
          dayOfWeek,
          serviceOptionId,
        );

        if (availabilities.length === 0) continue;

        // Get blocked times
        const blockedTimes = await this.blockedTimesService.findByUserAndDate(
          targetUserId,
          dateStr,
        );

        if (blockedTimes.some((bt) => bt.isFullDay)) continue;

        // Get existing appointments for this day in the organization's timezone
        // We need to query appointments that fall within 00:00 to 23:59:59 in the org timezone
        const dayStartInTz = createDateInTimezone(dateStr, '00:00', timezone);
        const dayEndInTz = createDateInTimezone(dateStr, '23:59', timezone);

        console.log('[getNextAvailableTime] Querying appointments for:', {
          dateStr,
          timezone,
          dayStartInTz: dayStartInTz.toISOString(),
          dayEndInTz: dayEndInTz.toISOString(),
          targetUserId,
        });

        const existingAppointments = await this.appointmentRepository.find({
          where: {
            userId: targetUserId,
            startTime: Between(dayStartInTz, dayEndInTz),
            status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION]),
          },
        });

        console.log('[getNextAvailableTime] Found appointments:', existingAppointments.map(a => ({
          id: a.id,
          startTime: a.startTime,
          endTime: a.endTime,
          status: a.status,
        })));

        // Check each availability window
        for (const availability of availabilities) {
          const [startHour, startMin] = availability.startTime.split(':').map(Number);
          const [endHour, endMin] = availability.endTime.split(':').map(Number);

          // Create slot times using the organization's timezone
          let slotStart = createDateInTimezone(dateStr, availability.startTime, timezone);
          const availabilityEnd = createDateInTimezone(dateStr, availability.endTime, timezone);

          while (slotStart.getTime() + duration * 60000 <= availabilityEnd.getTime()) {
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);

            // Check if slot is in the future and after min advance booking
            if (slotStart > minAdvanceDate) {
              // Check if blocked
              const isBlocked = blockedTimes.some((bt) => {
                if (bt.isFullDay) return true;
                const blockStart = createDateInTimezone(dateStr, bt.startTime, timezone);
                const blockEnd = createDateInTimezone(dateStr, bt.endTime, timezone);
                return slotStart < blockEnd && slotEnd > blockStart;
              });

              // Check if booked (considering buffer time before AND after appointments)
              // For a slot to be available:
              // 1. Slot must start AFTER existing appointment ends + buffer (respect buffer after appointments)
              // 2. Slot must end + buffer BEFORE existing appointment starts (respect buffer before appointments)
              // In other words: no overlap between [slotStart, slotEnd+buffer] and [aptStart-buffer, aptEnd+buffer]
              const isBooked = existingAppointments.some((apt) => {
                const aptStart = new Date(apt.startTime);
                const aptEnd = new Date(apt.endTime);
                // Buffer zone extends both before the appointment starts and after it ends
                const aptStartWithBufferBefore = new Date(aptStart.getTime() - buffer * 60000);
                const aptEndWithBufferAfter = new Date(aptEnd.getTime() + buffer * 60000);
                const slotEndWithBuffer = new Date(slotEnd.getTime() + buffer * 60000);
                // Check overlap: slot conflicts if there's any overlap between 
                // [slotStart, slotEndWithBuffer] and [aptStartWithBufferBefore, aptEndWithBufferAfter]
                const hasOverlap = slotStart < aptEndWithBufferAfter && slotEndWithBuffer > aptStartWithBufferBefore;
                
                if (hasOverlap) {
                  console.log('[getNextAvailableTime] Slot conflict detected:', {
                    slotStart: slotStart.toISOString(),
                    slotEnd: slotEnd.toISOString(),
                    slotEndWithBuffer: slotEndWithBuffer.toISOString(),
                    aptStart: aptStart.toISOString(),
                    aptEnd: aptEnd.toISOString(),
                    aptStartWithBufferBefore: aptStartWithBufferBefore.toISOString(),
                    aptEndWithBufferAfter: aptEndWithBufferAfter.toISOString(),
                    buffer,
                  });
                }
                
                return hasOverlap;
              });

              if (!isBlocked && !isBooked) {
                console.log('[getNextAvailableTime] Found available slot:', {
                  slotStart: slotStart.toISOString(),
                  slotEnd: slotEnd.toISOString(),
                  existingAppointmentsCount: existingAppointments.length,
                });
                // Found an available slot!
                // Get provider info
                const providerUser = await this.userServiceOptionsService.getUserById(targetUserId);
                
                return {
                  available: true,
                  nextSlot: {
                    startTime: slotStart.toISOString(),
                    endTime: slotEnd.toISOString(),
                    providerId: providerUser?.clerkId,
                    providerName: providerUser?.firstName 
                      ? `${providerUser.firstName} ${providerUser.lastName || ''}`.trim()
                      : undefined,
                  },
                };
              }
            }

            // Move to next slot - use 15 minute increments to catch gaps between appointments
            // (e.g., when an appointment in between was cancelled)
            const SLOT_INCREMENT_MINUTES = 5;
            slotStart = new Date(slotStart.getTime() + SLOT_INCREMENT_MINUTES * 60000);
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      available: false,
      nextSlot: null,
      message: 'No available slots found within the booking window',
    };
  }

  /**
   * Check if a specific time slot is available
   * Returns availability status and next available if not available
   */
  async checkTimeSlotAvailability(
    userId: string,
    serviceOptionId: string,
    startTime: string,
    providerId?: string,
    organizationId?: string,
  ): Promise<AvailabilityCheckResult> {
    const serviceOption = await this.serviceOptionsService.findById(serviceOptionId);
    
    // Get settings based on context
    let orgId = organizationId;
    if (!orgId) {
      const user = await this.appointmentRepository.manager.findOne('User', { where: { id: userId } }) as { organizationId: string } | null;
      orgId = user?.organizationId;
    }
    if (!orgId) {
      return { available: false, conflict: { reason: 'Organization not found' } };
    }
    const settings = await this.organizationSettingsService.findByOrganizationId(orgId);

    const requestedStart = new Date(startTime);
    const requestedEnd = new Date(requestedStart.getTime() + serviceOption.duration * 60000);
    const timezone = (settings as any).timezone || 'UTC';
    const dateStr = formatDateInTimezone(requestedStart, timezone);
    const dayOfWeek = getDayOfWeekInTimezone(requestedStart, timezone);
    const buffer = settings.bufferTimeMinutes;

    // Determine target user
    let targetUserId: string;
    
    if (providerId) {
      const targetUser = await this.userServiceOptionsService.getUserByClerkId(providerId);
      if (!targetUser) {
        return {
          available: false,
          conflict: {
            reason: 'Provider not found',
          },
        };
      }
      targetUserId = targetUser.id;
    } else {
      targetUserId = userId;
    }

    // Check min advance booking
    const minAdvanceDate = new Date();
    minAdvanceDate.setHours(minAdvanceDate.getHours() + settings.minAdvanceBookingHours);
    
    if (requestedStart < minAdvanceDate) {
      const nextAvailable = await this.getNextAvailableTime(
        userId, 
        serviceOptionId, 
        providerId, 
        undefined, 
        organizationId
      );
      return {
        available: false,
        conflict: {
          reason: `Appointments must be booked at least ${settings.minAdvanceBookingHours} hours in advance`,
        },
        nextAvailable: nextAvailable.nextSlot || undefined,
      };
    }

    // Check max advance booking
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + settings.maxAdvanceBookingDays);
    
    if (requestedStart > maxDate) {
      return {
        available: false,
        conflict: {
          reason: `Appointments can only be booked up to ${settings.maxAdvanceBookingDays} days in advance`,
        },
      };
    }

    // Check availability for this day
    const availabilities = await this.availabilityService.findByUserAndDay(
      targetUserId,
      dayOfWeek,
      serviceOptionId,
    );

    const hasAvailability = availabilities.some((av) => {
      const avStart = createDateInTimezone(dateStr, av.startTime, timezone);
      const avEnd = createDateInTimezone(dateStr, av.endTime, timezone);
      return requestedStart >= avStart && requestedEnd <= avEnd;
    });

    if (!hasAvailability) {
      const nextAvailable = await this.getNextAvailableTime(
        userId, 
        serviceOptionId, 
        providerId, 
        startTime, 
        organizationId
      );
      return {
        available: false,
        conflict: {
          reason: 'Provider is not available at this time',
        },
        nextAvailable: nextAvailable.nextSlot || undefined,
      };
    }

    // Check blocked times
    const blockedTimes = await this.blockedTimesService.findByUserAndDate(
      targetUserId,
      dateStr,
    );

    const isBlocked = blockedTimes.some((bt) => {
      if (bt.isFullDay) return true;
      const blockStart = createDateInTimezone(dateStr, bt.startTime, timezone);
      const blockEnd = createDateInTimezone(dateStr, bt.endTime, timezone);
      return requestedStart < blockEnd && requestedEnd > blockStart;
    });

    if (isBlocked) {
      const nextAvailable = await this.getNextAvailableTime(
        userId, 
        serviceOptionId, 
        providerId, 
        startTime, 
        organizationId
      );
      return {
        available: false,
        conflict: {
          reason: 'This time is blocked',
        },
        nextAvailable: nextAvailable.nextSlot || undefined,
      };
    }

    // Check existing appointments for this day in the organization's timezone
    const dayStartInTz = createDateInTimezone(dateStr, '00:00', timezone);
    const dayEndInTz = createDateInTimezone(dateStr, '23:59', timezone);

    const existingAppointments = await this.appointmentRepository.find({
      where: {
        userId: targetUserId,
        startTime: Between(dayStartInTz, dayEndInTz),
        status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION]),
      },
    });

    // Check for conflicts considering buffer time before AND after appointments
    // For a slot to be available:
    // 1. Slot must start AFTER existing appointment ends + buffer (respect buffer after appointments)
    // 2. Slot must end + buffer BEFORE existing appointment starts (respect buffer before appointments)
    const requestedEndWithBuffer = new Date(requestedEnd.getTime() + buffer * 60000);
    
    const conflictingAppointment = existingAppointments.find((apt) => {
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      // Buffer zone extends both before the appointment starts and after it ends
      const aptStartWithBufferBefore = new Date(aptStart.getTime() - buffer * 60000);
      const aptEndWithBufferAfter = new Date(aptEnd.getTime() + buffer * 60000);
      // Check overlap: requested conflicts if there's any overlap between 
      // [requestedStart, requestedEndWithBuffer] and [aptStartWithBufferBefore, aptEndWithBufferAfter]
      return requestedStart < aptEndWithBufferAfter && requestedEndWithBuffer > aptStartWithBufferBefore;
    });

    if (conflictingAppointment) {
      const nextAvailable = await this.getNextAvailableTime(
        userId, 
        serviceOptionId, 
        providerId, 
        startTime, 
        organizationId
      );
      return {
        available: false,
        conflict: {
          reason: 'This time slot is already booked',
          existingAppointment: {
            id: conflictingAppointment.id,
            clientName: conflictingAppointment.clientName,
            startTime: conflictingAppointment.startTime.toISOString(),
            endTime: conflictingAppointment.endTime.toISOString(),
          },
        },
        nextAvailable: nextAvailable.nextSlot || undefined,
      };
    }

    // All checks passed - slot is available
    return {
      available: true,
    };
  }

  // ==================== Public Token-based Operations ====================

  /**
   * Update an appointment by confirmation token (for clients)
   */
  async updateByToken(
    token: string,
    updateDto: UpdateAppointmentDto,
    organizationId: string,
  ): Promise<Appointment> {
    const appointment = await this.findByConfirmationToken(token);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Track if time was updated for notification
    const previousStartTime = appointment.startTime;
    let timeWasUpdated = false;

    // If startTime is being updated, validate and recalculate 
    if (updateDto.startTime) {
      const newStartTime = new Date(updateDto.startTime);
      const serviceOption = await this.serviceOptionsService.findById(appointment.serviceOptionId);
      const duration = serviceOption.duration;
      const newEndTime = new Date(newStartTime.getTime() + duration * 60000);

      // Check if time actually changed
      if (previousStartTime.getTime() !== newStartTime.getTime()) {
        timeWasUpdated = true;
      }

      // Validate new slot is available (excluding current appointment)
      const settings = await this.organizationSettingsService.findByOrganizationId(organizationId);
      const timezone = (settings as any).timezone || 'UTC';
      const dateStr = formatDateInTimezone(newStartTime, timezone);
      const dayOfWeek = getDayOfWeekInTimezone(newStartTime, timezone);
      const buffer = settings.bufferTimeMinutes;

      // Check availability
      const availabilities = await this.availabilityService.findByUserAndDay(
        appointment.userId,
        dayOfWeek,
        appointment.serviceOptionId,
      );

      const hasAvailability = availabilities.some((av) => {
        const avStart = createDateInTimezone(dateStr, av.startTime, timezone);
        const avEnd = createDateInTimezone(dateStr, av.endTime, timezone);
        return newStartTime >= avStart && newEndTime <= avEnd;
      });

      if (!hasAvailability) {
        throw new BadRequestException('Provider is not available at this time');
      }

      // Check for conflicts with other appointments
      const dayStartInTz = createDateInTimezone(dateStr, '00:00', timezone);
      const dayEndInTz = createDateInTimezone(dateStr, '23:59', timezone);

      const existingAppointments = await this.appointmentRepository.find({
        where: {
          userId: appointment.userId,
          startTime: Between(dayStartInTz, dayEndInTz),
          status: In([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION]),
        },
      });

      // Exclude current appointment from conflict check
      const otherAppointments = existingAppointments.filter(a => a.id !== appointment.id);

      const hasConflict = otherAppointments.some((apt) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        const aptStartWithBuffer = new Date(aptStart.getTime() - buffer * 60000);
        const aptEndWithBuffer = new Date(aptEnd.getTime() + buffer * 60000);
        const newEndWithBuffer = new Date(newEndTime.getTime() + buffer * 60000);
        return newStartTime < aptEndWithBuffer && newEndWithBuffer > aptStartWithBuffer;
      });

      if (hasConflict) {
        throw new BadRequestException('This time slot is no longer available');
      }

      appointment.startTime = newStartTime;
      appointment.endTime = newEndTime;
    }

    // Update other fields
    if (updateDto.clientName) appointment.clientName = updateDto.clientName;
    if (updateDto.clientEmail) appointment.clientEmail = updateDto.clientEmail;
    if (updateDto.clientPhone) appointment.clientPhone = updateDto.clientPhone;
    if (updateDto.notes) appointment.notes = updateDto.notes;

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Send reschedule notification if time was updated (for client-initiated reschedules)
    if (timeWasUpdated && (appointment.clientPhone || appointment.clientEmail)) {
      try {
        const fullAppointment = await this.appointmentRepository.findOne({
          where: { id: savedAppointment.id },
          relations: ['serviceOption', 'user'],
        });

        if (fullAppointment) {
          const notificationData: NotificationData = {
            organizationId,
            clientName: fullAppointment.clientName,
            clientPhone: fullAppointment.clientPhone || undefined,
            clientEmail: fullAppointment.clientEmail || undefined,
            serviceName: fullAppointment.serviceOption?.title || 'Appointment',
            appointmentDate: fullAppointment.startTime,
            providerName: fullAppointment.user?.firstName
              ? `${fullAppointment.user.firstName} ${fullAppointment.user.lastName || ''}`.trim()
              : undefined,
          };

          const result = await this.notificationService.sendAppointmentRescheduledNotification(notificationData);
          if (result.anySent) {
            this.logger.log(`Reschedule notification sent for appointment ${savedAppointment.id} (client-initiated)`);
          }
        }
      } catch (notificationError) {
        this.logger.error(`Failed to send reschedule notification`, notificationError);
      }
    }

    return this.appointmentRepository.findOneOrFail({
      where: { id: savedAppointment.id },
      relations: ['serviceOption', 'user'],
    });
  }

  /**
   * Cancel an appointment by confirmation token (for clients)
   */
  async cancelByToken(
    token: string,
    reason?: string,
    organizationId?: string,
  ): Promise<Appointment> {
    const appointment = await this.findByConfirmationToken(token);

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const previousStatus = appointment.status;
    appointment.status = AppointmentStatus.CANCELLED;
    if (reason) {
      appointment.notes = appointment.notes 
        ? `${appointment.notes}\n\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`;
    }

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Update client stats if we have organizationId
    if (organizationId && appointment.clientId) {
      try {
        await this.clientsService.updateAppointmentStats(
          appointment.clientId,
          organizationId,
          'cancelled',
        );
      } catch (error) {
        this.logger.error('Failed to update client stats on cancellation', error);
      }
    }

    // Send cancellation notification
    if (previousStatus !== AppointmentStatus.CANCELLED && (appointment.clientPhone || appointment.clientEmail)) {
      try {
        const fullAppointment = await this.appointmentRepository.findOne({
          where: { id: savedAppointment.id },
          relations: ['serviceOption', 'user'],
        });

        if (fullAppointment && organizationId) {
          const notificationData: NotificationData = {
            organizationId,
            clientName: fullAppointment.clientName,
            clientPhone: fullAppointment.clientPhone || undefined,
            clientEmail: fullAppointment.clientEmail || undefined,
            serviceName: fullAppointment.serviceOption?.title || 'Appointment',
            appointmentDate: fullAppointment.startTime,
            cancellationReason: reason,
          };

          const result = await this.notificationService.sendAppointmentCanceledNotification(notificationData);
          if (result.anySent) {
            this.logger.log(`Cancellation notification sent for appointment ${savedAppointment.id}`);
          }
        }
      } catch (error) {
        this.logger.error('Failed to send cancellation notification', error);
      }
    }

    return this.appointmentRepository.findOneOrFail({
      where: { id: savedAppointment.id },
      relations: ['serviceOption', 'user'],
    });
  }
}
