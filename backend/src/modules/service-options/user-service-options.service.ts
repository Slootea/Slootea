import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserServiceOption } from './entities/user-service-option.entity';
import { ServiceOption } from './entities/service-option.entity';
import { AssignServiceDto, UpdateUserServiceDto, BulkAssignServicesDto } from './dto/user-service-option.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class UserServiceOptionsService {
  constructor(
    @InjectRepository(UserServiceOption)
    private readonly userServiceOptionRepository: Repository<UserServiceOption>,
    @InjectRepository(ServiceOption)
    private readonly serviceOptionRepository: Repository<ServiceOption>,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Resolve user ID - handles both Clerk IDs and internal UUIDs
   * Clerk IDs start with "user_", internal IDs are UUIDs
   */
  private async resolveUserId(userIdOrClerkId: string): Promise<string> {
    // If it looks like a Clerk ID, look up the internal user
    if (userIdOrClerkId.startsWith('user_')) {
      const user = await this.usersService.findByClerkId(userIdOrClerkId);
      if (!user) {
        throw new NotFoundException(`User with Clerk ID ${userIdOrClerkId} not found`);
      }
      return user.id;
    }
    // Otherwise assume it's already an internal UUID
    return userIdOrClerkId;
  }

  /**
   * Assign a service to a user (member self-assigns or admin assigns)
   */
  async assignService(
    userIdOrClerkId: string,
    dto: AssignServiceDto,
    organizationId: string,
  ): Promise<UserServiceOption> {
    // Resolve to internal user ID
    const userId = await this.resolveUserId(userIdOrClerkId);

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
    userIdOrClerkId: string,
    dto: BulkAssignServicesDto,
    organizationId: string,
  ): Promise<UserServiceOption[]> {
    // Resolve to internal user ID
    const userId = await this.resolveUserId(userIdOrClerkId);

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
    userIdOrClerkId: string,
    serviceOptionId: string,
  ): Promise<void> {
    // Resolve to internal user ID
    const userId = await this.resolveUserId(userIdOrClerkId);

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
  async findByUser(userIdOrClerkId: string): Promise<UserServiceOption[]> {
    // Resolve to internal user ID
    const userId = await this.resolveUserId(userIdOrClerkId);

    return this.userServiceOptionRepository.find({
      where: { userId },
      relations: ['serviceOption'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all active services assigned to a user
   */
  async findActiveByUser(userIdOrClerkId: string): Promise<UserServiceOption[]> {
    // Resolve to internal user ID
    const userId = await this.resolveUserId(userIdOrClerkId);

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
    userIdOrClerkId: string,
    serviceOptionId: string,
    dto: UpdateUserServiceDto,
  ): Promise<UserServiceOption> {
    // Resolve to internal user ID
    const userId = await this.resolveUserId(userIdOrClerkId);

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
    userIdOrClerkId: string,
    serviceOptionId: string,
  ): Promise<UserServiceOption> {
    // Resolve to internal user ID
    const userId = await this.resolveUserId(userIdOrClerkId);

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
    // Simple query - just get assignments for this service
    // and verify the service belongs to the organization
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceOptionId, organizationId },
    });

    if (!service) {
      return [];
    }

    return this.userServiceOptionRepository.find({
      where: { serviceOptionId },
      relations: ['user'],
    });
  }
}
