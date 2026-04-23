import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserServiceOption } from './entities/user-service-option.entity';
import { ServiceOption } from './entities/service-option.entity';
import { AssignServiceDto, UpdateUserServiceDto, BulkAssignServicesDto, BulkAssignMembersToServiceDto } from './dto/user-service-option.dto';
import { UsersService } from '../users/users.service';
import { ClerkService } from '../auth/clerk.service';
import { ExternalProviderServiceOption } from '../external-providers/entities/external-provider-service-option.entity';
import { ExternalProvider } from '../external-providers/entities/external-provider.entity';

/**
 * Unified provider interface for booking flow
 */
export interface UnifiedProvider {
  id: string;
  type: 'member' | 'external';
  firstName?: string;
  lastName?: string;
  name?: string; // For external providers
  imageUrl?: string;
  email?: string;
  clerkId?: string; // Only for members
}

@Injectable()
export class UserServiceOptionsService {
  constructor(
    @InjectRepository(UserServiceOption)
    private readonly userServiceOptionRepository: Repository<UserServiceOption>,
    @InjectRepository(ServiceOption)
    private readonly serviceOptionRepository: Repository<ServiceOption>,
    @InjectRepository(ExternalProviderServiceOption)
    private readonly externalProviderServiceOptionRepository: Repository<ExternalProviderServiceOption>,
    @InjectRepository(ExternalProvider)
    private readonly externalProviderRepository: Repository<ExternalProvider>,
    private readonly usersService: UsersService,
    private readonly clerkService: ClerkService,
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
   * Get providers for a service in an organization (for booking/dashboard)
   * Returns enhanced provider data with Clerk profile info
   * @deprecated Use getUnifiedProvidersForService for booking flow
   */
  async getProvidersForService(
    serviceOptionId: string,
    organizationId: string,
  ): Promise<Array<{
    id: string;
    clerkId: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    email: string;
  }>> {
    // Verify the service belongs to the organization
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceOptionId, organizationId },
    });

    if (!service) {
      return [];
    }

    // Get all assignments for this service with active status
    const assignments = await this.userServiceOptionRepository.find({
      where: { serviceOptionId, isActive: true },
      relations: ['user'],
    });

    // Enhance each provider with Clerk profile data (cached)
    const providers = await Promise.all(
      assignments.map(async (assignment) => {
        const user = assignment.user;
        if (!user) return null;

        const clerkUser = await this.clerkService.getCachedUserById(user.clerkId);
        return {
          id: user.id,
          clerkId: user.clerkId,
          firstName: clerkUser?.firstName || user.firstName,
          lastName: clerkUser?.lastName || user.lastName,
          imageUrl: clerkUser?.imageUrl,
          email: clerkUser?.email || user.email,
        };
      }),
    );

    // Filter out any null results
    return providers.filter((p): p is NonNullable<typeof p> => p !== null);
  }

  /**
   * Get all providers (members + external) for a service in unified format
   * Used in booking flow and provider selection
   */
  async getUnifiedProvidersForService(
    serviceOptionId: string,
    organizationId: string,
  ): Promise<UnifiedProvider[]> {
    // Verify the service belongs to the organization
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceOptionId, organizationId },
    });

    if (!service) {
      return [];
    }

    // Get member providers
    const memberAssignments = await this.userServiceOptionRepository.find({
      where: { serviceOptionId, isActive: true },
      relations: ['user'],
    });

    const memberProvidersRaw = await Promise.all(
      memberAssignments.map(async (assignment) => {
        const user = assignment.user;
        if (!user) return null;

        // Cached lookup — avoids hitting the Clerk REST API on every slot check.
        const clerkUser = await this.clerkService.getCachedUserById(user.clerkId);
        return {
          id: user.id,
          type: 'member' as const,
          firstName: clerkUser?.firstName || user.firstName,
          lastName: clerkUser?.lastName || user.lastName,
          imageUrl: clerkUser?.imageUrl,
          email: clerkUser?.email || user.email,
          clerkId: user.clerkId,
        };
      }),
    );

    // Filter out nulls
    const memberProviders: UnifiedProvider[] = memberProvidersRaw.filter(
      (p): p is NonNullable<typeof p> => p !== null
    );

    // Get external providers
    const externalAssignments = await this.externalProviderServiceOptionRepository.find({
      where: { serviceOptionId, isActive: true },
      relations: ['externalProvider'],
    });

    const externalProviders: UnifiedProvider[] = externalAssignments
      .filter((a) => a.externalProvider && a.externalProvider.organizationId === organizationId && a.externalProvider.isActive)
      .map((a) => ({
        id: a.externalProvider.id,
        type: 'external' as const,
        name: a.externalProvider.name,
        imageUrl: a.externalProvider.imageBase64 || undefined,
      }));

    // Combine and return
    const allProviders = [
      ...memberProviders,
      ...externalProviders,
    ];

    return allProviders;
  }

  /**
   * Bulk assign multiple members to a service (admin only)
   * This replaces all existing assignments with the provided member list
   */
  async bulkAssignMembersToService(
    serviceOptionId: string,
    dto: BulkAssignMembersToServiceDto,
    organizationId: string,
  ): Promise<{ added: number; removed: number; total: number }> {
    // Verify service exists in the organization
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceOptionId, organizationId },
    });

    if (!service) {
      throw new NotFoundException('Service not found in this organization');
    }

    // Resolve all member IDs (they might be Clerk IDs or internal UUIDs)
    const resolvedUserIds: string[] = [];
    for (const memberId of dto.memberIds) {
      const userId = await this.resolveUserId(memberId);
      resolvedUserIds.push(userId);
    }

    // Get current assignments for this service
    const currentAssignments = await this.userServiceOptionRepository.find({
      where: { serviceOptionId },
    });
    const currentUserIds = currentAssignments.map(a => a.userId);

    // Determine who to add and who to remove
    const toAdd = resolvedUserIds.filter(id => !currentUserIds.includes(id));
    const toRemove = currentUserIds.filter(id => !resolvedUserIds.includes(id));

    // Remove assignments for users no longer in the list
    if (toRemove.length > 0) {
      await this.userServiceOptionRepository.delete({
        serviceOptionId,
        userId: In(toRemove),
      });
    }

    // Add new assignments
    if (toAdd.length > 0) {
      const newAssignments = toAdd.map(userId =>
        this.userServiceOptionRepository.create({
          userId,
          serviceOptionId,
          isActive: true,
        }),
      );
      await this.userServiceOptionRepository.save(newAssignments);
    }

    return {
      added: toAdd.length,
      removed: toRemove.length,
      total: resolvedUserIds.length,
    };
  }

  /**
   * Bulk assign both members and external providers to a service (admin only)
   * This replaces all existing assignments with the provided provider lists
   */
  async bulkAssignProvidersToService(
    serviceOptionId: string,
    memberIds: string[],
    externalProviderIds: string[],
    organizationId: string,
  ): Promise<{ 
    members: { added: number; removed: number; total: number };
    externalProviders: { added: number; removed: number; total: number };
  }> {
    // Verify service exists in the organization
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceOptionId, organizationId },
    });

    if (!service) {
      throw new NotFoundException('Service not found in this organization');
    }

    // ========== Handle Members ==========
    const resolvedUserIds: string[] = [];
    for (const memberId of memberIds) {
      try {
        const userId = await this.resolveUserId(memberId);
        resolvedUserIds.push(userId);
      } catch (error) {
        // Skip invalid member IDs
        console.warn(`Could not resolve member ID: ${memberId}`, error);
      }
    }

    // Get current member assignments for this service
    const currentMemberAssignments = await this.userServiceOptionRepository.find({
      where: { serviceOptionId },
    });
    const currentUserIds = currentMemberAssignments.map(a => a.userId);

    // Determine who to add and who to remove (members)
    const membersToAdd = resolvedUserIds.filter(id => !currentUserIds.includes(id));
    const membersToRemove = currentUserIds.filter(id => !resolvedUserIds.includes(id));

    // Remove member assignments
    if (membersToRemove.length > 0) {
      await this.userServiceOptionRepository.delete({
        serviceOptionId,
        userId: In(membersToRemove),
      });
    }

    // Add new member assignments
    if (membersToAdd.length > 0) {
      const newMemberAssignments = membersToAdd.map(userId =>
        this.userServiceOptionRepository.create({
          userId,
          serviceOptionId,
          isActive: true,
        }),
      );
      await this.userServiceOptionRepository.save(newMemberAssignments);
    }

    // ========== Handle External Providers ==========
    // Verify all external provider IDs belong to this organization
    const validExternalProviderIds: string[] = [];
    for (const epId of externalProviderIds) {
      const provider = await this.externalProviderRepository.findOne({
        where: { id: epId, organizationId },
      });
      if (provider) {
        validExternalProviderIds.push(epId);
      } else {
        console.warn(`External provider ${epId} not found in organization ${organizationId}`);
      }
    }

    // Get current external provider assignments for this service
    const currentExternalAssignments = await this.externalProviderServiceOptionRepository.find({
      where: { serviceOptionId },
      relations: ['externalProvider'],
    });
    // Filter to only assignments belonging to this organization
    const currentExternalIds = currentExternalAssignments
      .filter(a => a.externalProvider?.organizationId === organizationId)
      .map(a => a.externalProviderId);

    // Determine who to add and who to remove (external providers)
    const externalToAdd = validExternalProviderIds.filter(id => !currentExternalIds.includes(id));
    const externalToRemove = currentExternalIds.filter(id => !validExternalProviderIds.includes(id));

    // Remove external provider assignments
    if (externalToRemove.length > 0) {
      await this.externalProviderServiceOptionRepository.delete({
        serviceOptionId,
        externalProviderId: In(externalToRemove),
      });
    }

    // Add new external provider assignments
    if (externalToAdd.length > 0) {
      const newExternalAssignments = externalToAdd.map(externalProviderId =>
        this.externalProviderServiceOptionRepository.create({
          externalProviderId,
          serviceOptionId,
          isActive: true,
        }),
      );
      await this.externalProviderServiceOptionRepository.save(newExternalAssignments);
    }

    return {
      members: {
        added: membersToAdd.length,
        removed: membersToRemove.length,
        total: resolvedUserIds.length,
      },
      externalProviders: {
        added: externalToAdd.length,
        removed: externalToRemove.length,
        total: validExternalProviderIds.length,
      },
    };
  }

  /**
   * Get user by Clerk ID
   */
  async getUserByClerkId(clerkId: string): Promise<{
    id: string;
    clerkId: string;
    firstName?: string;
    lastName?: string;
    email: string;
  } | null> {
    try {
      const user = await this.usersService.findByClerkId(clerkId);
      if (!user) return null;
      return {
        id: user.id,
        clerkId: user.clerkId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get user by internal ID
   */
  async getUserById(userId: string): Promise<{
    id: string;
    clerkId: string;
    firstName?: string;
    lastName?: string;
    email: string;
  } | null> {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) return null;
      return {
        id: user.id,
        clerkId: user.clerkId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      };
    } catch {
      return null;
    }
  }
}
