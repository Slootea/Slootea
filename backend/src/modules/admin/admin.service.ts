import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, Between, In } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { UserOrganization } from '../organizations/entities/user-organization.entity';
import { User } from '../users/entities/user.entity';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { ServiceOption } from '../service-options/entities/service-option.entity';
import { UserServiceOption } from '../service-options/entities/user-service-option.entity';
import { OrganizationSettings } from '../settings/entities/organization-settings.entity';
import { BookingLink } from '../booking-links/entities/booking-link.entity';
import { Client } from '../clients/entities/client.entity';
import { ClerkService } from '../auth/clerk.service';
import {
  OrganizationQueryDto,
  UsersQueryDto,
  AppointmentsQueryDto,
  SortOrder,
} from './dto/admin-query.dto';
import {
  AdminUpdateOrganizationDto,
  AdminUpdateOrganizationSettingsDto,
  AdminCreateServiceDto,
  AdminUpdateServiceDto,
} from './dto/admin-actions.dto';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemStats {
  totalOrganizations: number;
  totalUsers: number;
  totalAppointments: number;
  totalServices: number;
  totalClients: number;
  appointmentsByStatus: Record<string, number>;
  recentActivityCount: number;
  organizationsCreatedThisMonth: number;
  appointmentsThisMonth: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(ServiceOption)
    private readonly serviceOptionRepository: Repository<ServiceOption>,
    @InjectRepository(UserServiceOption)
    private readonly userServiceOptionRepository: Repository<UserServiceOption>,
    @InjectRepository(OrganizationSettings)
    private readonly orgSettingsRepository: Repository<OrganizationSettings>,
    @InjectRepository(BookingLink)
    private readonly bookingLinkRepository: Repository<BookingLink>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly clerkService: ClerkService,
  ) {}

  // ==================== System Statistics ====================

  async getSystemStats(): Promise<SystemStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrganizations,
      totalUsers,
      totalAppointments,
      totalServices,
      totalClients,
      orgsThisMonth,
      appointmentsThisMonth,
    ] = await Promise.all([
      this.organizationRepository.count(),
      this.userRepository.count(),
      this.appointmentRepository.count(),
      this.serviceOptionRepository.count(),
      this.clientRepository.count(),
      this.organizationRepository.count({
        where: {
          created_at: Between(startOfMonth, now),
        },
      }),
      this.appointmentRepository.count({
        where: {
          createdAt: Between(startOfMonth, now),
        },
      }),
    ]);

    // Get appointments by status
    const appointmentsByStatus = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('appointment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('appointment.status')
      .getRawMany();

    const statusCounts: Record<string, number> = {};
    appointmentsByStatus.forEach((item) => {
      statusCounts[item.status] = parseInt(item.count, 10);
    });

    // Recent activity (last 24 hours)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentActivityCount = await this.appointmentRepository.count({
      where: {
        createdAt: Between(yesterday, now),
      },
    });

    return {
      totalOrganizations,
      totalUsers,
      totalAppointments,
      totalServices,
      totalClients,
      appointmentsByStatus: statusCounts,
      recentActivityCount,
      organizationsCreatedThisMonth: orgsThisMonth,
      appointmentsThisMonth,
    };
  }

  // ==================== Organizations Management ====================

  async getAllOrganizations(
    query: OrganizationQueryDto,
  ): Promise<PaginatedResponse<Organization>> {
    const { page = 1, limit = 10, search, sortBy, sortOrder, industry } = query;
    const skip = (page - 1) * limit;

    this.logger.log(`getAllOrganizations called with query: ${JSON.stringify(query)}`);

    // Sync organizations from Clerk first
    await this.syncOrganizationsFromClerk();

    const queryBuilder = this.organizationRepository.createQueryBuilder('org');

    if (search) {
      queryBuilder.where(
        '(org.name ILIKE :search OR org.description ILIKE :search OR org.industry ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (industry) {
      queryBuilder.andWhere('org.industry = :industry', { industry });
    }

    const orderField = sortBy || 'created_at';
    const orderDir = sortOrder || SortOrder.DESC;
    queryBuilder.orderBy(`org.${orderField}`, orderDir);

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    this.logger.log(`getAllOrganizations found ${total} organizations`);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Sync all organizations from Clerk to local database
   */
  private async syncOrganizationsFromClerk(): Promise<void> {
    try {
      const { data: clerkOrgs, totalCount } = await this.clerkService.getAllOrganizations(100, 0);
      this.logger.log(`Syncing ${clerkOrgs.length} organizations from Clerk (total: ${totalCount})`);

      for (const clerkOrg of clerkOrgs) {
        let org = await this.organizationRepository.findOne({
          where: { id: clerkOrg.id },
        });

        if (!org) {
          // Create new organization
          org = this.organizationRepository.create({
            id: clerkOrg.id,
            name: clerkOrg.name,
            description: (clerkOrg.publicMetadata as any)?.description || undefined,
            industry: (clerkOrg.publicMetadata as any)?.industry || 'General',
            website: (clerkOrg.publicMetadata as any)?.website || undefined,
            location: (clerkOrg.publicMetadata as any)?.location || undefined,
            logo_url: clerkOrg.imageUrl || undefined,
          });
          await this.organizationRepository.save(org);
          this.logger.log(`Created organization: ${clerkOrg.name} (${clerkOrg.id})`);
        } else {
          // Update existing organization name if changed
          if (org.name !== clerkOrg.name || org.logo_url !== clerkOrg.imageUrl) {
            org.name = clerkOrg.name;
            org.logo_url = clerkOrg.imageUrl || org.logo_url;
            await this.organizationRepository.save(org);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync organizations from Clerk: ${error.message}`);
      // Don't throw - continue with existing local data
    }
  }

  async getOrganizationById(id: string): Promise<Organization> {
    const org = await this.organizationRepository.findOne({
      where: { id },
      relations: ['userOrganizations', 'userOrganizations.user'],
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async getOrganizationDetails(id: string): Promise<{
    organization: Organization;
    settings: OrganizationSettings | null;
    services: ServiceOption[];
    members: any[];
    bookingLinks: BookingLink[];
    stats: {
      totalAppointments: number;
      totalServices: number;
      totalMembers: number;
      totalClients: number;
    };
  }> {
    const organization = await this.getOrganizationById(id);

    const [settings, services, bookingLinks, clerkMembers] = await Promise.all([
      this.orgSettingsRepository.findOne({ where: { organizationId: id } }),
      this.serviceOptionRepository.find({ where: { organizationId: id } }),
      this.bookingLinkRepository.find({ where: { organizationId: id } }),
      this.clerkService.getOrganizationMembers(id),
    ]);

    // Get members from user organization table
    const userOrgs = await this.userOrganizationRepository.find({
      where: { organizationId: id },
      relations: ['user'],
    });

    // Get stats
    const [totalAppointments, totalClients] = await Promise.all([
      this.appointmentRepository
        .createQueryBuilder('apt')
        .innerJoin('apt.serviceOption', 'so')
        .where('so.organizationId = :orgId', { orgId: id })
        .getCount(),
      this.clientRepository.count({
        where: { organizationId: id },
      }),
    ]);

    // Merge Clerk members with local user data
    const mergedMembers = clerkMembers.map((clerkMember) => {
      const localUserOrg = userOrgs.find((uo) => uo.user?.clerkId === clerkMember.userId);
      return {
        ...localUserOrg,
        clerkMember,
      };
    });

    return {
      organization,
      settings,
      services,
      members: mergedMembers,
      bookingLinks,
      stats: {
        totalAppointments,
        totalServices: services.length,
        totalMembers: clerkMembers.length, // Use Clerk member count
        totalClients,
      },
    };
  }

  async updateOrganization(
    id: string,
    updateDto: AdminUpdateOrganizationDto,
  ): Promise<Organization> {
    const org = await this.getOrganizationById(id);
    Object.assign(org, updateDto);
    return this.organizationRepository.save(org);
  }

  async deleteOrganization(id: string): Promise<void> {
    const org = await this.getOrganizationById(id);
    await this.organizationRepository.remove(org);
    this.logger.warn(`Admin deleted organization: ${id}`);
  }

  // ==================== Organization Settings ====================

  async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings> {
    let settings = await this.orgSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.orgSettingsRepository.create({ organizationId });
      settings = await this.orgSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateOrganizationSettings(
    organizationId: string,
    updateDto: AdminUpdateOrganizationSettingsDto,
  ): Promise<OrganizationSettings> {
    let settings = await this.orgSettingsRepository.findOne({
      where: { organizationId },
    });

    if (!settings) {
      settings = this.orgSettingsRepository.create({
        organizationId,
        ...updateDto,
      });
    } else {
      Object.assign(settings, updateDto);
    }

    return this.orgSettingsRepository.save(settings);
  }

  // ==================== Services Management ====================

  async getOrganizationServices(organizationId: string): Promise<ServiceOption[]> {
    return this.serviceOptionRepository.find({
      where: { organizationId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async createService(
    organizationId: string,
    createDto: AdminCreateServiceDto,
  ): Promise<ServiceOption> {
    // Check org exists
    await this.getOrganizationById(organizationId);

    const service = this.serviceOptionRepository.create({
      ...createDto,
      organizationId,
      isActive: true,
    });

    return this.serviceOptionRepository.save(service);
  }

  async updateService(
    serviceId: string,
    updateDto: AdminUpdateServiceDto,
  ): Promise<ServiceOption> {
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    Object.assign(service, updateDto);
    return this.serviceOptionRepository.save(service);
  }

  async deleteService(serviceId: string): Promise<void> {
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.serviceOptionRepository.remove(service);
    this.logger.warn(`Admin deleted service: ${serviceId}`);
  }

  // ==================== Service Provider Assignment ====================

  async getServiceProviders(serviceId: string): Promise<Array<{
    id: string;
    clerkId: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
    email: string;
  }>> {
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const assignments = await this.userServiceOptionRepository.find({
      where: { serviceOptionId: serviceId, isActive: true },
      relations: ['user'],
    });

    const providers = await Promise.all(
      assignments.map(async (assignment) => {
        const user = assignment.user;
        if (!user) return null;

        try {
          const clerkUser = await this.clerkService.getUserById(user.clerkId);
          return {
            id: user.id,
            clerkId: user.clerkId,
            firstName: clerkUser.firstName || user.firstName,
            lastName: clerkUser.lastName || user.lastName,
            imageUrl: clerkUser.imageUrl,
            email: clerkUser.email || user.email,
          };
        } catch (error) {
          return {
            id: user.id,
            clerkId: user.clerkId,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: undefined,
            email: user.email,
          };
        }
      }),
    );

    return providers.filter((p): p is NonNullable<typeof p> => p !== null);
  }

  async bulkAssignProviders(
    serviceId: string,
    memberIds: string[],
  ): Promise<{ added: number; removed: number; total: number }> {
    const service = await this.serviceOptionRepository.findOne({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Resolve Clerk IDs to internal user IDs
    const resolvedUserIds: string[] = [];
    for (const memberId of memberIds) {
      const userId = await this.resolveUserId(memberId);
      if (userId) {
        resolvedUserIds.push(userId);
      }
    }

    // Get current assignments
    const currentAssignments = await this.userServiceOptionRepository.find({
      where: { serviceOptionId: serviceId },
    });
    const currentUserIds = currentAssignments.map(a => a.userId);

    // Users to add
    const toAdd = resolvedUserIds.filter(id => !currentUserIds.includes(id));
    // Users to remove
    const toRemove = currentUserIds.filter(id => !resolvedUserIds.includes(id));

    // Remove assignments
    if (toRemove.length > 0) {
      await this.userServiceOptionRepository.delete({
        serviceOptionId: serviceId,
        userId: In(toRemove),
      });
    }

    // Add new assignments
    for (const userId of toAdd) {
      const assignment = this.userServiceOptionRepository.create({
        userId,
        serviceOptionId: serviceId,
        isActive: true,
      });
      await this.userServiceOptionRepository.save(assignment);
    }

    this.logger.log(`Admin bulk assigned providers to service ${serviceId}: +${toAdd.length}, -${toRemove.length}`);

    return {
      added: toAdd.length,
      removed: toRemove.length,
      total: resolvedUserIds.length,
    };
  }

  private async resolveUserId(memberId: string): Promise<string | null> {
    // Check if it's already an internal UUID
    const userByUuid = await this.userRepository.findOne({
      where: { id: memberId },
    });
    if (userByUuid) return userByUuid.id;

    // Check if it's a Clerk ID
    const userByClerkId = await this.userRepository.findOne({
      where: { clerkId: memberId },
    });
    if (userByClerkId) return userByClerkId.id;

    // User not found - they need to be created when they first sign in
    this.logger.warn(`Could not resolve user ID for member: ${memberId}`);
    return null;
  }

  // ==================== Users Management ====================

  async getAllUsers(query: UsersQueryDto): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10, search, sortBy, sortOrder, organizationId, role } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        '(user.email ILIKE :search OR user.businessName ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (organizationId) {
      queryBuilder.andWhere('user.activeOrganizationId = :organizationId', { organizationId });
    }

    // Role filtering uses user_organizations table
    // Roles are stored as 'org:admin' or 'org:member' to match Clerk
    if (role) {
      queryBuilder
        .innerJoin('user_organizations', 'uo', 'uo.user_id = user.id')
        .andWhere('uo.role = :role', { role });
    }

    const orderField = sortBy || 'createdAt';
    const orderDir = sortOrder || SortOrder.DESC;
    queryBuilder.orderBy(`user.${orderField}`, orderDir);

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['serviceOptions', 'appointments'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserByClerkId(clerkId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { clerkId },
      relations: ['serviceOptions', 'appointments'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserPublicMetadata(
    clerkId: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    await this.clerkService.updateUserMetadata(clerkId, metadata);
    this.logger.log(`Admin updated metadata for user: ${clerkId}`);
  }

  async setUserAsSystemAdmin(clerkId: string): Promise<void> {
    await this.clerkService.updateUserMetadata(clerkId, { role: 'admin' });
    this.logger.warn(`Admin granted system admin role to user: ${clerkId}`);
  }

  async removeSystemAdminRole(clerkId: string): Promise<void> {
    await this.clerkService.updateUserMetadata(clerkId, { role: 'user' });
    this.logger.warn(`Admin revoked system admin role from user: ${clerkId}`);
  }

  // ==================== Appointments Management ====================

  async getAllAppointments(
    query: AppointmentsQueryDto,
  ): Promise<PaginatedResponse<Appointment>> {
    const { page = 1, limit = 10, search, sortBy, sortOrder, organizationId, status, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('apt')
      .leftJoinAndSelect('apt.serviceOption', 'service')
      .leftJoinAndSelect('apt.user', 'user')
      .leftJoinAndSelect('apt.client', 'client');

    if (search) {
      queryBuilder.where(
        '(apt.clientName ILIKE :search OR apt.clientEmail ILIKE :search OR apt.clientPhone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (organizationId) {
      queryBuilder.andWhere('service.organizationId = :organizationId', { organizationId });
    }

    if (status) {
      queryBuilder.andWhere('apt.status = :status', { status });
    }

    if (startDate) {
      queryBuilder.andWhere('apt.startTime >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('apt.startTime <= :endDate', { endDate: new Date(endDate) });
    }

    const orderField = sortBy || 'createdAt';
    const orderDir = sortOrder || SortOrder.DESC;
    queryBuilder.orderBy(`apt.${orderField}`, orderDir);

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAppointmentById(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['serviceOption', 'user', 'client', 'bookingLink'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    const appointment = await this.getAppointmentById(id);
    appointment.status = status;
    return this.appointmentRepository.save(appointment);
  }

  // ==================== Booking Links ====================

  async getOrganizationBookingLinks(organizationId: string): Promise<BookingLink[]> {
    return this.bookingLinkRepository.find({
      where: { organizationId },
      relations: ['serviceOption'],
    });
  }

  async deleteBookingLink(id: string): Promise<void> {
    const link = await this.bookingLinkRepository.findOne({ where: { id } });
    if (!link) {
      throw new NotFoundException('Booking link not found');
    }
    await this.bookingLinkRepository.remove(link);
    this.logger.warn(`Admin deleted booking link: ${id}`);
  }

  // ==================== Audit / Activity ====================

  async getRecentActivity(limit: number = 20): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      relations: ['serviceOption', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
