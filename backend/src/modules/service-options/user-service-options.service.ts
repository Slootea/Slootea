import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserServiceOption } from './entities/user-service-option.entity';
import { ServiceOption } from './entities/service-option.entity';
import { AssignServiceDto, UpdateUserServiceDto, BulkAssignServicesDto } from './dto/user-service-option.dto';

@Injectable()
export class UserServiceOptionsService {
  constructor(
    @InjectRepository(UserServiceOption)
    private readonly userServiceOptionRepository: Repository<UserServiceOption>,
    @InjectRepository(ServiceOption)
    private readonly serviceOptionRepository: Repository<ServiceOption>,
  ) {}

  /**
   * Assign a service to a user (member self-assigns or admin assigns)
   */
  async assignService(
    userId: string,
    dto: AssignServiceDto,
    organizationId: string,
  ): Promise<UserServiceOption> {
    // Verify service exists and belongs to the organization
    const service = await this.serviceOptionRepository.findOne({
      where: { id: dto.serviceOptionId, organizationId },
    });

    if (!service) {
      throw new NotFoundException('Service not found in this organization');
    }

    // Check if already assigned
    const existing = await this.userServiceOptionRepository.findOne({
      where: { userId, serviceOptionId: dto.serviceOptionId },
    });

    if (existing) {
      // Update existing assignment
      Object.assign(existing, {
        isActive: dto.isActive ?? existing.isActive,
        customDuration: dto.customDuration,
        customDescription: dto.customDescription,
      });
      return this.userServiceOptionRepository.save(existing);
    }

    // Create new assignment
    const assignment = this.userServiceOptionRepository.create({
      userId,
      serviceOptionId: dto.serviceOptionId,
      isActive: dto.isActive ?? true,
      customDuration: dto.customDuration,
      customDescription: dto.customDescription,
    });

    return this.userServiceOptionRepository.save(assignment);
  }

  /**
   * Bulk assign services to a user
   */
  async bulkAssignServices(
    userId: string,
    dto: BulkAssignServicesDto,
    organizationId: string,
  ): Promise<UserServiceOption[]> {
    // Verify all services exist in the organization
    const services = await this.serviceOptionRepository.find({
      where: { id: In(dto.serviceOptionIds), organizationId },
    });

    if (services.length !== dto.serviceOptionIds.length) {
      throw new NotFoundException('One or more services not found in this organization');
    }

    // Get existing assignments
    const existing = await this.userServiceOptionRepository.find({
      where: { userId, serviceOptionId: In(dto.serviceOptionIds) },
    });
    const existingIds = new Set(existing.map(e => e.serviceOptionId));

    // Create new assignments for those not already assigned
    const newAssignments = dto.serviceOptionIds
      .filter(id => !existingIds.has(id))
      .map(serviceOptionId => 
        this.userServiceOptionRepository.create({
          userId,
          serviceOptionId,
          isActive: true,
        })
      );

    if (newAssignments.length > 0) {
      await this.userServiceOptionRepository.save(newAssignments);
    }

    return this.findByUser(userId);
  }

  /**
   * Remove a service assignment from a user
   */
  async removeServiceAssignment(
    userId: string,
    serviceOptionId: string,
  ): Promise<void> {
    const assignment = await this.userServiceOptionRepository.findOne({
      where: { userId, serviceOptionId },
    });

    if (!assignment) {
      throw new NotFoundException('Service assignment not found');
    }

    await this.userServiceOptionRepository.remove(assignment);
  }

  /**
   * Get all services assigned to a user
   */
  async findByUser(userId: string): Promise<UserServiceOption[]> {
    return this.userServiceOptionRepository.find({
      where: { userId },
      relations: ['serviceOption'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all active services assigned to a user
   */
  async findActiveByUser(userId: string): Promise<UserServiceOption[]> {
    return this.userServiceOptionRepository.find({
      where: { userId, isActive: true },
      relations: ['serviceOption'],
    });
  }

  /**
   * Get all users providing a specific service
   */
  async findUsersByService(serviceOptionId: string): Promise<UserServiceOption[]> {
    return this.userServiceOptionRepository.find({
      where: { serviceOptionId, isActive: true },
      relations: ['user'],
    });
  }

  /**
   * Update a user's service assignment
   */
  async updateAssignment(
    userId: string,
    serviceOptionId: string,
    dto: UpdateUserServiceDto,
  ): Promise<UserServiceOption> {
    const assignment = await this.userServiceOptionRepository.findOne({
      where: { userId, serviceOptionId },
      relations: ['serviceOption'],
    });

    if (!assignment) {
      throw new NotFoundException('Service assignment not found');
    }

    Object.assign(assignment, dto);
    return this.userServiceOptionRepository.save(assignment);
  }

  /**
   * Toggle a service assignment active status
   */
  async toggleActive(
    userId: string,
    serviceOptionId: string,
  ): Promise<UserServiceOption> {
    const assignment = await this.userServiceOptionRepository.findOne({
      where: { userId, serviceOptionId },
      relations: ['serviceOption'],
    });

    if (!assignment) {
      throw new NotFoundException('Service assignment not found');
    }

    assignment.isActive = !assignment.isActive;
    return this.userServiceOptionRepository.save(assignment);
  }

  /**
   * Get providers for a service in an organization (for booking)
   */
  async getProvidersForService(
    serviceOptionId: string,
    organizationId: string,
  ): Promise<UserServiceOption[]> {
    return this.userServiceOptionRepository
      .createQueryBuilder('uso')
      .innerJoinAndSelect('uso.user', 'user')
      .innerJoin('uso.serviceOption', 'so')
      .innerJoin('user_organizations', 'uo', 'uo.user_id = uso.userId')
      .where('uso.serviceOptionId = :serviceOptionId', { serviceOptionId })
      .andWhere('uso.isActive = :isActive', { isActive: true })
      .andWhere('so.organizationId = :organizationId', { organizationId })
      .andWhere('uo.organization_id = :organizationId', { organizationId })
      .getMany();
  }
}
