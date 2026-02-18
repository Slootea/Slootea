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

    // Add creator as owner
    const userOrganization = this.userOrganizationsRepository.create({
      userId: userId,
      organizationId: savedOrganization.id,
      role: UserOrganizationRole.OWNER,
    });

    console.log("Creating user organization:", userOrganization);
    await this.userOrganizationsRepository.save(userOrganization);

    return savedOrganization;
  }

  async findAllForUser(userId: string): Promise<Organization[]> {
    // Fetch organizations from Clerk first to ensure they're synced
    try {
      const clerkMemberships = await this.clerkService.getUserOrganizations(userId);
      
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
          
          // Sync membership
          await this.syncMembershipFromClerk(
            userId,
            clerkOrg.id,
            membership.role
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync organizations from Clerk: ${error.message}`);
    }

    // Now fetch from local DB (which should be synced)
    const userOrganizations = await this.userOrganizationsRepository.find({
      where: { userId: userId },
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
    // Check if user has admin access
    const userOrganization = await this.userOrganizationsRepository.findOne({
      where: [
        {
          userId: userId,
          organizationId: id,
          role: UserOrganizationRole.OWNER,
        },
        {
          userId: userId,
          organizationId: id,
          role: UserOrganizationRole.ADMIN,
        },
      ],
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
    // Check if user is owner
    const userOrganization = await this.userOrganizationsRepository.findOne({
      where: {
        userId: userId,
        organizationId: id,
        role: UserOrganizationRole.OWNER,
      },
    });

    if (!userOrganization) {
      throw new ForbiddenException(
        "Only organization owners can delete organizations"
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
    // Check if inviter has admin access
    const inviterRole = await this.userOrganizationsRepository.findOne({
      where: [
        {
          userId: inviterId,
          organizationId: organizationId,
          role: UserOrganizationRole.OWNER,
        },
        {
          userId: inviterId,
          organizationId: organizationId,
          role: UserOrganizationRole.ADMIN,
        },
      ],
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

    // Fetch members directly from Clerk
    const clerkMembers = await this.clerkService.getOrganizationMembers(organizationId);
    
    // Map to include user details
    const membersWithDetails = await Promise.all(
      clerkMembers.map(async (member) => {
        try {
          const user = await this.clerkService.getUserById(member.userId);
          return {
            userId: member.userId,
            organizationId,
            role: member.role,
            user: {
              clerkId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              imageUrl: user.imageUrl,
            },
          };
        } catch {
          return {
            userId: member.userId,
            organizationId,
            role: member.role,
            user: null,
          };
        }
      })
    );

    return membersWithDetails;
  }
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    role: UserOrganizationRole,
    adminId: string
  ): Promise<void> {
    // Check if admin has sufficient permissions
    const adminRole = await this.userOrganizationsRepository.findOne({
      where: [
        {
          userId: adminId,
          organizationId: organizationId,
          role: UserOrganizationRole.OWNER,
        },
        {
          userId: adminId,
          organizationId: organizationId,
          role: UserOrganizationRole.ADMIN,
        },
      ],
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
    // Check if admin has sufficient permissions
    const adminRole = await this.userOrganizationsRepository.findOne({
      where: [
        {
          userId: adminId,
          organizationId: organizationId,
          role: UserOrganizationRole.OWNER,
        },
        {
          userId: adminId,
          organizationId: organizationId,
          role: UserOrganizationRole.ADMIN,
        },
      ],
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
    if (
      adminRole !== UserOrganizationRole.OWNER &&
      adminRole !== UserOrganizationRole.ADMIN
    ) {
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
      role: UserOrganizationRole.RECRUITER,
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
   * Maps Clerk roles to local UserOrganizationRole
   */
  async syncMembershipFromClerk(
    userId: string,
    organizationId: string,
    clerkRole: string,
  ): Promise<void> {
    // Map Clerk roles to local roles
    let localRole: UserOrganizationRole;
    switch (clerkRole) {
      case 'org:admin':
        localRole = UserOrganizationRole.ADMIN;
        break;
      case 'org:member':
      default:
        localRole = UserOrganizationRole.RECRUITER;
        break;
    }

    // Check if membership already exists
    const existing = await this.userOrganizationsRepository.findOne({
      where: { userId: userId, organizationId: organizationId },
    });

    if (existing) {
      // Update role if changed
      if (existing.role !== localRole) {
        existing.role = localRole;
        await this.userOrganizationsRepository.save(existing);
        this.logger.log(`Updated membership for user ${userId} in org ${organizationId}: ${localRole}`);
      }
    } else {
      // Create new membership
      const membership = this.userOrganizationsRepository.create({
        userId: userId,
        organizationId: organizationId,
        role: localRole,
      });
      await this.userOrganizationsRepository.save(membership);
      this.logger.log(`Created membership for user ${userId} in org ${organizationId}: ${localRole}`);
    }
  }

  /**
   * Remove organization membership (called when user leaves org in Clerk)
   */
  async removeMembershipFromClerk(userId: string, organizationId: string): Promise<void> {
    await this.userOrganizationsRepository.delete({
      userId: userId,
      organizationId: organizationId,
    });
    this.logger.log(`Removed membership for user ${userId} from org ${organizationId}`);
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
   */
  async getOnboardingStatus(organizationId: string): Promise<{ onboarded: boolean }> {
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
      select: ['id', 'onboarded'],
    });

    if (!organization) {
      // If org not found locally, assume not onboarded
      return { onboarded: false };
    }

    return { onboarded: organization.onboarded || false };
  }

  /**
   * Complete onboarding for an organization
   * Sets onboarded flag to true and creates a default booking link
   */
  async completeOnboarding(organizationId: string): Promise<{ success: boolean; bookingLink?: { id: string; slug: string } }> {
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
