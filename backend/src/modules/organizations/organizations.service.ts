import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Organization } from "./entities/organization.entity";
import {
  UserOrganization,
  UserOrganizationRole,
} from "./entities/user-organization.entity";
import { User } from "../users/entities/user.entity";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { ClerkService } from "../auth/clerk.service";
import { BookingLinksService } from "../booking-links/booking-links.service";
import { BookingLinkType } from "../booking-links/entities/booking-link.entity";

/**
 * OrganizationsService - Updated for Clerk Integration
 * 
 * This service now syncs organization memberships with Clerk.
 * Organization creation and membership management should be done through Clerk,
 * and this service mirrors that data locally for database relationships.
 */
@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private userOrganizationsRepository: Repository<UserOrganization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private clerkService: ClerkService,
    @Inject(forwardRef(() => BookingLinksService))
    private bookingLinksService: BookingLinksService,
  ) {}
  async create(
    createOrganizationDto: CreateOrganizationDto,
    userId: string
  ): Promise<Organization> {
    console.log(
      "Creating organization with userId:",
      userId,
      "type:",
      typeof userId
    );

    const organization = this.organizationsRepository.create(
      createOrganizationDto
    );
    const savedOrganization =
      await this.organizationsRepository.save(organization);

    // Add creator as admin (org:admin role)
    const userOrganization = this.userOrganizationsRepository.create({
      userId: userId,
      organizationId: savedOrganization.id,
      role: UserOrganizationRole.ADMIN,
    });

    console.log("Creating user organization:", userOrganization);
    await this.userOrganizationsRepository.save(userOrganization);

    return savedOrganization;
  }

  /**
   * Get all organizations for a user
   * @param clerkUserId - The Clerk user ID (e.g., user_xxx)
   */
  async findAllForUser(clerkUserId: string): Promise<Organization[]> {
    // Fetch organizations from Clerk first to ensure they're synced
    try {
      const clerkMemberships = await this.clerkService.getUserOrganizations(clerkUserId);
      
      // Sync each organization from Clerk
      for (const membership of clerkMemberships) {
        const clerkOrg = await this.clerkService.getOrganization(membership.organizationId);
        if (clerkOrg) {
          // Sync organization to local DB
          await this.syncOrganizationFromClerk(
            clerkOrg.id,
            clerkOrg.name,
            clerkOrg.publicMetadata
          );
          
          // Sync membership (this method resolves Clerk ID to internal UUID)
          await this.syncMembershipFromClerk(
            clerkUserId,
            clerkOrg.id,
            membership.role
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync organizations from Clerk: ${error.message}`);
    }

    // Resolve Clerk user ID to internal ID for local DB query
    const user = await this.userRepository.findOne({
      where: { clerkId: clerkUserId },
    });
    
    if (!user) {
      this.logger.warn(`User with Clerk ID ${clerkUserId} not found in local DB`);
      return [];
    }

    // Now fetch from local DB (which should be synced)
    const userOrganizations = await this.userOrganizationsRepository.find({
      where: { userId: user.id },
      relations: ["organization"],
    });

    return userOrganizations.map((uo) => uo.organization);
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findOne({
      where: { id },
      relations: ["userOrganizations", "userOrganizations.user"],
    });

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    return organization;
  }
  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
    userId: string
  ): Promise<Organization> {
    // Check if user has admin access (org:admin role)
    const userOrganization = await this.userOrganizationsRepository.findOne({
      where: {
        userId: userId,
        organizationId: id,
        role: UserOrganizationRole.ADMIN,
      },
    });

    if (!userOrganization) {
      throw new ForbiddenException(
        "Insufficient permissions to update this organization"
      );
    }

    await this.organizationsRepository.update(id, updateOrganizationDto);
    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    // Check if user is admin (org:admin role)
    const userOrganization = await this.userOrganizationsRepository.findOne({
      where: {
        userId: userId,
        organizationId: id,
        role: UserOrganizationRole.ADMIN,
      },
    });

    if (!userOrganization) {
      throw new ForbiddenException(
        "Only organization admins can delete organizations"
      );
    }

    await this.organizationsRepository.delete(id);
  }
  async inviteUser(
    organizationId: string,
    userEmail: string,
    role: UserOrganizationRole,
    inviterId: string
  ): Promise<void> {
    // Check if inviter has admin access (org:admin role)
    const inviterRole = await this.userOrganizationsRepository.findOne({
      where: {
        userId: inviterId,
        organizationId: organizationId,
        role: UserOrganizationRole.ADMIN,
      },
    });

    if (!inviterRole) {
      throw new ForbiddenException("Insufficient permissions to invite users");
    }

    // TODO: Implement email invitation logic
    // For now, just create the user organization relationship if user exists
  }

  async getMembers(organizationId: string, userId: string) {
    // Check if user has access to this organization via Clerk
    const userMemberships = await this.clerkService.getUserOrganizations(userId);
    const hasAccess = userMemberships.some(m => m.organizationId === organizationId);

    if (!hasAccess) {
      throw new ForbiddenException("Access denied to this organization");
    }

    // Fetch members directly from Clerk (already includes publicUserData)
    const clerkMembers = await this.clerkService.getOrganizationMembers(organizationId);

    return clerkMembers.map((member) => ({
      userId: member.userId,
      organizationId,
      role: member.role,
      user: {
        clerkId: member.userId,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        imageUrl: member.imageUrl,
      },
    }));
  }
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    role: UserOrganizationRole,
    adminId: string
  ): Promise<void> {
    // Check if admin has sufficient permissions (org:admin role)
    const adminRole = await this.userOrganizationsRepository.findOne({
      where: {
        userId: adminId,
        organizationId: organizationId,
        role: UserOrganizationRole.ADMIN,
      },
    });

    if (!adminRole) {
      throw new ForbiddenException(
        "Insufficient permissions to update member roles"
      );
    }

    await this.userOrganizationsRepository.update(
      { userId: memberId, organizationId: organizationId },
      { role }
    );
  }
  async removeMember(
    organizationId: string,
    memberId: string,
    adminId: string
  ): Promise<void> {
    // Check if admin has sufficient permissions (org:admin role)
    const adminRole = await this.userOrganizationsRepository.findOne({
      where: {
        userId: adminId,
        organizationId: organizationId,
        role: UserOrganizationRole.ADMIN,
      },
    });

    if (!adminRole) {
      throw new ForbiddenException(
        "Insufficient permissions to remove members"
      );
    }

    await this.userOrganizationsRepository.delete({
      userId: memberId,
      organizationId: organizationId,
    });
  }

  async addMember(
    organizationId: string,
    memberEmail: string,
    adminId: string
  ): Promise<void> {
    const adminRole = await this.getOrganizationRole(organizationId, adminId);
    if (adminRole !== UserOrganizationRole.ADMIN) {
      throw new ForbiddenException("Insufficient permissions to add members");
    }
    //fetch-user-id-based-on-email
    const member = await this.userOrganizationsRepository
      .createQueryBuilder("user")
      .where("user.email = :email", { email: memberEmail })
      .select(["user.id"])
      .getOne();

    if (!member) {
      throw new NotFoundException("User not found");
    }

    await this.userOrganizationsRepository.save({
      userId: member.id,
      organizationId: organizationId,
      role: UserOrganizationRole.MEMBER,
    });
  }

  async getOrganizationRole(
    organizationId: string,
    userId: string
  ): Promise<UserOrganizationRole> {
    const userOrganization = await this.userOrganizationsRepository.findOne({
      where: { userId: userId, organizationId: organizationId },
      select: ["role"],
    });

    if (!userOrganization) {
      throw new ForbiddenException("Access denied to this organization");
    }

    return userOrganization.role;
  }

  /**
   * Sync organization from Clerk to local database
   * This should be called when organization events are received from Clerk webhooks
   */
  async syncOrganizationFromClerk(clerkOrgId: string, name: string, metadata?: any): Promise<Organization> {
    let organization = await this.organizationsRepository.findOne({
      where: { id: clerkOrgId },
    });

    if (organization) {
      // Update existing organization
      organization.name = name;
      if (metadata?.description) organization.description = metadata.description;
      if (metadata?.industry) organization.industry = metadata.industry;
      if (metadata?.website) organization.website = metadata.website;
      if (metadata?.location) organization.location = metadata.location;
      return this.organizationsRepository.save(organization);
    }

    // Create new organization with Clerk ID
    organization = this.organizationsRepository.create({
      id: clerkOrgId,
      name,
      description: metadata?.description,
      industry: metadata?.industry || 'General',
      website: metadata?.website,
      location: metadata?.location,
    });

    return this.organizationsRepository.save(organization);
  }

  /**
   * Sync organization membership from Clerk
   * Clerk roles are stored directly (org:admin, org:member)
   * @param clerkUserId - The Clerk user ID (e.g., user_xxx)
   * @param organizationId - The Clerk organization ID (synced to local DB)
   * @param clerkRole - The role from Clerk (org:admin or org:member)
   */
  async syncMembershipFromClerk(
    clerkUserId: string,
    organizationId: string,
    clerkRole: string,
  ): Promise<void> {
    this.logger.log(`[syncMembershipFromClerk] START - clerkUserId: ${clerkUserId}, orgId: ${organizationId}, clerkRole: ${clerkRole}`);
    
    // Resolve Clerk user ID to internal database UUID
    const user = await this.userRepository.findOne({
      where: { clerkId: clerkUserId },
    });
    
    if (!user) {
      this.logger.warn(`Cannot sync membership: user with Clerk ID ${clerkUserId} not found in local DB`);
      return;
    }

    const internalUserId = user.id;
    this.logger.log(`[syncMembershipFromClerk] Resolved Clerk ID ${clerkUserId} to internal UUID ${internalUserId}`);

    // Clerk roles map directly to UserOrganizationRole
    const localRole = clerkRole === 'org:admin' 
      ? UserOrganizationRole.ADMIN 
      : UserOrganizationRole.MEMBER;
    this.logger.log(`[syncMembershipFromClerk] Mapped clerkRole "${clerkRole}" to localRole "${localRole}"`);

    // Check if membership already exists
    const existing = await this.userOrganizationsRepository.findOne({
      where: { userId: internalUserId, organizationId: organizationId },
    });

    if (existing) {
      this.logger.log(`[syncMembershipFromClerk] Found existing membership with role: ${existing.role}`);
      // Update role if changed
      if (existing.role !== localRole) {
        this.logger.log(`[syncMembershipFromClerk] Updating role from ${existing.role} to ${localRole}`);
        existing.role = localRole;
        await this.userOrganizationsRepository.save(existing);
        this.logger.log(`Updated membership for user ${internalUserId} in org ${organizationId}: ${localRole}`);
      } else {
        this.logger.log(`[syncMembershipFromClerk] Role unchanged, no update needed`);
      }
    } else {
      // Create new membership
      this.logger.log(`[syncMembershipFromClerk] No existing membership found, creating new one`);
      const membership = this.userOrganizationsRepository.create({
        userId: internalUserId,
        organizationId: organizationId,
        role: localRole,
      });
      await this.userOrganizationsRepository.save(membership);
      this.logger.log(`Created membership for user ${internalUserId} in org ${organizationId}: ${localRole}`);
    }
  }

  /**
   * Remove organization membership (called when user leaves org in Clerk)
   * @param clerkUserId - The Clerk user ID (e.g., user_xxx)
   * @param organizationId - The organization ID
   */
  async removeMembershipFromClerk(clerkUserId: string, organizationId: string): Promise<void> {
    // Resolve Clerk user ID to internal database UUID
    const user = await this.userRepository.findOne({
      where: { clerkId: clerkUserId },
    });
    
    if (!user) {
      this.logger.warn(`Cannot remove membership: user with Clerk ID ${clerkUserId} not found in local DB`);
      return;
    }

    await this.userOrganizationsRepository.delete({
      userId: user.id,
      organizationId: organizationId,
    });
    this.logger.log(`Removed membership for user ${user.id} from org ${organizationId}`);
  }

  /**
   * Sync all memberships for an organization from Clerk
   */
  async syncAllMemberships(organizationId: string): Promise<void> {
    const members = await this.clerkService.getOrganizationMembers(organizationId);
    
    for (const member of members) {
      await this.syncMembershipFromClerk(
        member.userId,
        organizationId,
        member.role,
      );
    }
    
    this.logger.log(`Synced ${members.length} memberships for org ${organizationId}`);
  }

  /**
   * Get onboarding status for an organization
   * Will sync from Clerk if org not found locally
   * @param organizationId - The organization ID
   * @param clerkUserId - Optional Clerk user ID to sync membership
   */
  async getOnboardingStatus(organizationId: string, clerkUserId?: string): Promise<{ onboarded: boolean }> {
    let organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
      select: ['id', 'onboarded'],
    });

    if (!organization) {
      // Try to sync from Clerk first
      try {
        const clerkOrg = await this.clerkService.getOrganization(organizationId);
        if (clerkOrg) {
          organization = await this.syncOrganizationFromClerk(
            clerkOrg.id,
            clerkOrg.name,
            clerkOrg.publicMetadata
          );
          this.logger.log(`Synced org ${organizationId} from Clerk for onboarding check`);
        }
      } catch (error) {
        this.logger.warn(`Failed to sync org ${organizationId} from Clerk: ${error.message}`);
      }
    }

    // Sync membership for the user if Clerk user ID is provided
    if (clerkUserId) {
      try {
        const memberships = await this.clerkService.getUserOrganizations(clerkUserId);
        const orgMembership = memberships.find(m => m.organizationId === organizationId);
        if (orgMembership) {
          await this.syncMembershipFromClerk(clerkUserId, organizationId, orgMembership.role);
        }
      } catch (error) {
        this.logger.warn(`Failed to sync membership during onboarding check: ${error.message}`);
      }
    }

    if (!organization) {
      // If org still not found, assume not onboarded
      return { onboarded: false };
    }

    return { onboarded: organization.onboarded || false };
  }

  /**
   * Complete onboarding for an organization
   * Sets onboarded flag to true and creates a default booking link
   * @param organizationId - The organization ID
   * @param clerkUserId - Optional Clerk user ID to sync membership
   */
  async completeOnboarding(organizationId: string, clerkUserId?: string): Promise<{ success: boolean; bookingLink?: { id: string; slug: string } }> {
    // First ensure the organization exists
    let organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });

    if (!organization) {
      // Try to sync from Clerk
      const clerkOrg = await this.clerkService.getOrganization(organizationId);
      if (clerkOrg) {
        organization = await this.syncOrganizationFromClerk(
          clerkOrg.id,
          clerkOrg.name,
          clerkOrg.publicMetadata
        );
      }
    }

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Sync membership for the user if Clerk user ID is provided
    if (clerkUserId) {
      try {
        const memberships = await this.clerkService.getUserOrganizations(clerkUserId);
        const orgMembership = memberships.find(m => m.organizationId === organizationId);
        if (orgMembership) {
          await this.syncMembershipFromClerk(clerkUserId, organizationId, orgMembership.role);
        }
      } catch (error) {
        this.logger.warn(`Failed to sync membership during onboarding: ${error.message}`);
      }
    }

    // Update onboarded status
    organization.onboarded = true;
    await this.organizationsRepository.save(organization);

    // Create a default booking link for the organization
    try {
      const bookingLink = await this.bookingLinksService.create(organizationId, {
        name: 'Default Booking Link',
        type: BookingLinkType.ALL_OPTIONS,
      });

      this.logger.log(`Completed onboarding for organization ${organizationId}, created booking link ${bookingLink.slug}`);

      return { 
        success: true, 
        bookingLink: { 
          id: bookingLink.id, 
          slug: bookingLink.slug 
        } 
      };
    } catch (error) {
      this.logger.error(`Failed to create booking link during onboarding: ${error.message}`);
      // Still mark as onboarded even if booking link creation fails
      return { success: true };
    }
  }
}
