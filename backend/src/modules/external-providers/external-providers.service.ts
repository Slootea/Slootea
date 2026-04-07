import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ExternalProvider } from './entities/external-provider.entity';
import { ExternalProviderServiceOption } from './entities/external-provider-service-option.entity';
import { Availability, DayOfWeek } from '../availability/entities/availability.entity';
import { BlockedTime } from '../blocked-times/entities/blocked-time.entity';
import {
  CreateExternalProviderDto,
  UpdateExternalProviderDto,
  CreateExternalProviderAvailabilityDto,
  CreateExternalProviderBlockedTimeDto,
} from './dto/external-provider.dto';

@Injectable()
export class ExternalProvidersService {
  constructor(
    @InjectRepository(ExternalProvider)
    private readonly externalProviderRepository: Repository<ExternalProvider>,
    @InjectRepository(ExternalProviderServiceOption)
    private readonly externalProviderServiceOptionRepository: Repository<ExternalProviderServiceOption>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
    @InjectRepository(BlockedTime)
    private readonly blockedTimeRepository: Repository<BlockedTime>,
  ) {}

  // ============ CRUD Operations ============

  async create(
    organizationId: string,
    dto: CreateExternalProviderDto,
  ): Promise<ExternalProvider> {
    const provider = this.externalProviderRepository.create({
      ...dto,
      organizationId,
    });
    return this.externalProviderRepository.save(provider);
  }

  async findAll(organizationId: string): Promise<ExternalProvider[]> {
    return this.externalProviderRepository.find({
      where: { organizationId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, organizationId: string): Promise<ExternalProvider> {
    const provider = await this.externalProviderRepository.findOne({
      where: { id, organizationId },
    });
    if (!provider) {
      throw new NotFoundException('External provider not found');
    }
    return provider;
  }

  async update(
    id: string,
    organizationId: string,
    dto: UpdateExternalProviderDto,
  ): Promise<ExternalProvider> {
    const provider = await this.findOne(id, organizationId);
    Object.assign(provider, dto);
    return this.externalProviderRepository.save(provider);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const provider = await this.findOne(id, organizationId);
    await this.externalProviderRepository.remove(provider);
  }

  // ============ Service Assignment ============

  async assignServices(
    id: string,
    organizationId: string,
    serviceOptionIds: string[],
  ): Promise<{ added: number; removed: number; total: number }> {
    const provider = await this.findOne(id, organizationId);

    // Get current assignments
    const currentAssignments = await this.externalProviderServiceOptionRepository.find({
      where: { externalProviderId: id },
    });
    const currentServiceIds = currentAssignments.map((a) => a.serviceOptionId);

    // Calculate additions and removals
    const toAdd = serviceOptionIds.filter((sid) => !currentServiceIds.includes(sid));
    const toRemove = currentServiceIds.filter((sid) => !serviceOptionIds.includes(sid));

    // Remove old assignments
    if (toRemove.length > 0) {
      await this.externalProviderServiceOptionRepository.delete({
        externalProviderId: id,
        serviceOptionId: In(toRemove),
      });
    }

    // Add new assignments
    if (toAdd.length > 0) {
      const newAssignments = toAdd.map((serviceOptionId) =>
        this.externalProviderServiceOptionRepository.create({
          externalProviderId: id,
          serviceOptionId,
        }),
      );
      await this.externalProviderServiceOptionRepository.save(newAssignments);
    }

    return {
      added: toAdd.length,
      removed: toRemove.length,
      total: serviceOptionIds.length,
    };
  }

  async getAssignedServices(
    id: string,
    organizationId: string,
  ): Promise<ExternalProviderServiceOption[]> {
    await this.findOne(id, organizationId); // Validate provider exists
    return this.externalProviderServiceOptionRepository.find({
      where: { externalProviderId: id },
      relations: ['serviceOption'],
    });
  }

  /**
   * Get external providers assigned to a specific service
   */
  async getProvidersForService(
    serviceOptionId: string,
    organizationId: string,
  ): Promise<Array<{
    id: string;
    type: 'external';
    name: string;
    imageUrl?: string;
  }>> {
    const assignments = await this.externalProviderServiceOptionRepository.find({
      where: { serviceOptionId, isActive: true },
      relations: ['externalProvider'],
    });

    return assignments
      .filter((a) => a.externalProvider && a.externalProvider.organizationId === organizationId && a.externalProvider.isActive)
      .map((a) => ({
        id: a.externalProvider.id,
        type: 'external' as const,
        name: a.externalProvider.name,
        imageUrl: a.externalProvider.imageBase64 || undefined,
      }));
  }

  // ============ Availability Management ============

  async getAvailability(id: string, organizationId: string): Promise<Availability[]> {
    await this.findOne(id, organizationId);
    return this.availabilityRepository.find({
      where: { externalProviderId: id },
      relations: ['serviceOption'],
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async createAvailability(
    id: string,
    organizationId: string,
    dto: CreateExternalProviderAvailabilityDto,
  ): Promise<Availability> {
    await this.findOne(id, organizationId);
    const availability = this.availabilityRepository.create({
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      serviceOptionId: dto.serviceOptionId,
      externalProviderId: id,
    });
    return this.availabilityRepository.save(availability);
  }

  async createBulkAvailability(
    id: string,
    organizationId: string,
    dtos: CreateExternalProviderAvailabilityDto[],
  ): Promise<Availability[]> {
    await this.findOne(id, organizationId);
    const availabilities = dtos.map((dto) =>
      this.availabilityRepository.create({
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        serviceOptionId: dto.serviceOptionId,
        externalProviderId: id,
      }),
    );
    return this.availabilityRepository.save(availabilities);
  }

  async updateAvailability(
    id: string,
    availabilityId: string,
    organizationId: string,
    dto: Partial<CreateExternalProviderAvailabilityDto>,
  ): Promise<Availability> {
    await this.findOne(id, organizationId);
    const availability = await this.availabilityRepository.findOne({
      where: { id: availabilityId, externalProviderId: id },
    });
    if (!availability) {
      throw new NotFoundException('Availability not found');
    }
    Object.assign(availability, dto);
    return this.availabilityRepository.save(availability);
  }

  async deleteAvailability(
    id: string,
    availabilityId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(id, organizationId);
    const result = await this.availabilityRepository.delete({
      id: availabilityId,
      externalProviderId: id,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Availability not found');
    }
  }

  async clearAllAvailability(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId);
    await this.availabilityRepository.delete({ externalProviderId: id });
  }

  /**
   * Get availability for a specific day (used in booking flow)
   */
  async findByProviderAndDay(
    externalProviderId: string,
    dayOfWeek: DayOfWeek,
    serviceOptionId?: string,
  ): Promise<Availability[]> {
    const query = this.availabilityRepository.createQueryBuilder('av')
      .where('av.externalProviderId = :externalProviderId', { externalProviderId })
      .andWhere('av.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('av.isActive = :isActive', { isActive: true });

    if (serviceOptionId) {
      // Get both general availability and service-specific availability
      query.andWhere('(av.serviceOptionId IS NULL OR av.serviceOptionId = :serviceOptionId)', {
        serviceOptionId,
      });
    } else {
      // Only general availability if no specific service requested
      query.andWhere('av.serviceOptionId IS NULL');
    }

    return query.getMany();
  }

  // ============ Blocked Times Management ============

  async getBlockedTimes(id: string, organizationId: string): Promise<BlockedTime[]> {
    await this.findOne(id, organizationId);
    return this.blockedTimeRepository.find({
      where: { externalProviderId: id },
      order: { date: 'ASC', startTime: 'ASC' },
    });
  }

  async createBlockedTime(
    id: string,
    organizationId: string,
    dto: CreateExternalProviderBlockedTimeDto,
  ): Promise<BlockedTime> {
    await this.findOne(id, organizationId);

    // Validate: if not full day, both start and end times are required
    if (!dto.isFullDay && (!dto.startTime || !dto.endTime)) {
      throw new BadRequestException('Start and end times are required for non-full-day blocks');
    }

    const blockedTime = this.blockedTimeRepository.create({
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isFullDay: dto.isFullDay || false,
      reason: dto.reason,
      externalProviderId: id,
    });
    return this.blockedTimeRepository.save(blockedTime);
  }

  async deleteBlockedTime(
    id: string,
    blockedTimeId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(id, organizationId);
    const result = await this.blockedTimeRepository.delete({
      id: blockedTimeId,
      externalProviderId: id,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Blocked time not found');
    }
  }

  /**
   * Get blocked times for a specific date (used in booking flow)
   */
  async findBlockedTimesByDate(
    externalProviderId: string,
    date: string,
  ): Promise<BlockedTime[]> {
    return this.blockedTimeRepository.find({
      where: { externalProviderId, date },
    });
  }
}
