import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThan } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from './dto/appointment.dto';
import { ServiceOptionsService } from '../service-options/service-options.service';
import { AvailabilityService } from '../availability/availability.service';
import { BlockedTimesService } from '../blocked-times/blocked-times.service';
import { SettingsService } from '../settings/settings.service';
import { BookingLinksService } from '../booking-links/booking-links.service';
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
    private readonly bookingLinksService: BookingLinksService,
  ) {}

  async create(createDto: CreateAppointmentDto): Promise<Appointment> {
    // Get booking link to find the user
    const bookingLink = await this.bookingLinksService.findBySlug(
      createDto.bookingLinkId || '',
    );
    const userId = bookingLink.userId;

    // Get service option
    const serviceOption = await this.serviceOptionsService.findById(
      createDto.serviceOptionId,
    );

    // Validate the slot is available
    const startTime = new Date(createDto.startTime);
    const endTime = new Date(
      startTime.getTime() + serviceOption.duration * 60000,
    );

    // Check if slot is available
    const isAvailable = await this.isSlotAvailable(
      userId,
      createDto.serviceOptionId,
      startTime,
      endTime,
    );

    if (!isAvailable) {
      throw new BadRequestException('This time slot is no longer available');
    }

    // Create appointment
    const confirmationToken = uuidv4();
    const appointment = this.appointmentRepository.create({
      ...createDto,
      startTime,
      endTime,
      userId,
      confirmationToken,
      status: AppointmentStatus.PENDING_CONFIRMATION,
    });

    return this.appointmentRepository.save(appointment);
  }

  async findAllByUser(userId: string): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: { userId },
      relations: ['serviceOption'],
      order: { startTime: 'DESC' },
    });
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

    // Create appointment
    const confirmationToken = uuidv4();
    const appointment = this.appointmentRepository.create({
      ...createDto,
      startTime,
      endTime,
      userId,
      confirmationToken,
      status: AppointmentStatus.PENDING_CONFIRMATION,
    });

    return this.appointmentRepository.save(appointment);
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);
    Object.assign(appointment, updateDto);
    return this.appointmentRepository.save(appointment);
  }

  async cancel(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findOne(id, userId);
    appointment.status = AppointmentStatus.CANCELLED;
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
}
