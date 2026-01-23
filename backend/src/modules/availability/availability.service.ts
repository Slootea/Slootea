import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Availability, DayOfWeek } from './entities/availability.entity';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
} from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
  ) {}

  async create(
    userId: string,
    createDto: CreateAvailabilityDto,
  ): Promise<Availability> {
    const availability = this.availabilityRepository.create({
      ...createDto,
      userId,
    });
    return this.availabilityRepository.save(availability);
  }

  /**
   * Admin creates availability for a specific member
   */
  async createForMember(
    targetUserId: string,
    createDto: CreateAvailabilityDto,
  ): Promise<Availability> {
    const availability = this.availabilityRepository.create({
      ...createDto,
      userId: targetUserId,
    });
    return this.availabilityRepository.save(availability);
  }

  async createBulk(
    userId: string,
    createDtos: CreateAvailabilityDto[],
  ): Promise<Availability[]> {
    const availabilities = createDtos.map((dto) =>
      this.availabilityRepository.create({
        ...dto,
        userId,
      }),
    );
    return this.availabilityRepository.save(availabilities);
  }

  /**
   * Admin creates bulk availability for a specific member
   */
  async createBulkForMember(
    targetUserId: string,
    createDtos: CreateAvailabilityDto[],
  ): Promise<Availability[]> {
    const availabilities = createDtos.map((dto) =>
      this.availabilityRepository.create({
        ...dto,
        userId: targetUserId,
      }),
    );
    return this.availabilityRepository.save(availabilities);
  }

  async findAllByUser(userId: string): Promise<Availability[]> {
    return this.availabilityRepository.find({
      where: { userId },
      relations: ['serviceOption'],
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  /**
   * Get availability for all members in an organization
   */
  async findAllByOrganizationMembers(memberIds: string[]): Promise<Availability[]> {
    if (memberIds.length === 0) return [];
    
    return this.availabilityRepository.find({
      where: { userId: In(memberIds) },
      relations: ['serviceOption', 'user'],
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findByUserAndDay(
    userId: string,
    dayOfWeek: DayOfWeek,
    serviceOptionId?: string,
  ): Promise<Availability[]> {
    const whereClause: any = { userId, dayOfWeek, isActive: true };
    
    // Get general availability (no specific service option) or specific to the service
    return this.availabilityRepository.find({
      where: [
        { ...whereClause, serviceOptionId: null },
        ...(serviceOptionId ? [{ ...whereClause, serviceOptionId }] : []),
      ],
      order: { startTime: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Availability> {
    const availability = await this.availabilityRepository.findOne({
      where: { id, userId },
      relations: ['serviceOption'],
    });
    if (!availability) {
      throw new NotFoundException('Availability not found');
    }
    return availability;
  }

  /**
   * Find availability by ID (admin access - any user's availability)
   */
  async findById(id: string): Promise<Availability> {
    const availability = await this.availabilityRepository.findOne({
      where: { id },
      relations: ['serviceOption', 'user'],
    });
    if (!availability) {
      throw new NotFoundException('Availability not found');
    }
    return availability;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateAvailabilityDto,
  ): Promise<Availability> {
    const availability = await this.findOne(id, userId);
    Object.assign(availability, updateDto);
    return this.availabilityRepository.save(availability);
  }

  /**
   * Admin updates any member's availability
   */
  async updateAsAdmin(
    id: string,
    updateDto: UpdateAvailabilityDto,
  ): Promise<Availability> {
    const availability = await this.findById(id);
    Object.assign(availability, updateDto);
    return this.availabilityRepository.save(availability);
  }

  async remove(id: string, userId: string): Promise<void> {
    const availability = await this.findOne(id, userId);
    await this.availabilityRepository.remove(availability);
  }

  /**
   * Admin removes any member's availability
   */
  async removeAsAdmin(id: string): Promise<void> {
    const availability = await this.findById(id);
    await this.availabilityRepository.remove(availability);
  }

  async removeAllByUser(userId: string): Promise<void> {
    await this.availabilityRepository.delete({ userId });
  }

  /**
   * Check if user owns this availability (for permission checks)
   */
  async isOwner(availabilityId: string, userId: string): Promise<boolean> {
    const availability = await this.availabilityRepository.findOne({
      where: { id: availabilityId },
      select: ['userId'],
    });
    return availability?.userId === userId;
  }
}
