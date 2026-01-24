import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient, verifyToken } from '@clerk/backend';

export interface ClerkUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  organizationId?: string;
  organizationRole?: 'org:admin' | 'org:member';
  isOrgAdmin?: boolean;
  memberships?: Array<{
    organizationId: string;
    role: 'org:admin' | 'org:member' | string;
    isAdmin: boolean;
  }>;
  publicMetadata?: {
    role?: 'admin' | 'user' | 'guest';
    [key: string]: any;
  };
}


@Injectable()
export class ClerkService {
  private clerkClient;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    this.clerkClient = createClerkClient({ secretKey });
  }

async verifyToken(token: string): Promise<ClerkUser> {
  try {
    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) throw new UnauthorizedException('Clerk secret key not configured');

    const payload = await verifyToken(token, { secretKey });
    if (!payload?.sub) throw new UnauthorizedException('Invalid token');

    const user = await this.clerkClient.users.getUser(payload.sub);

    // Fetch organizations explicitly
    const memberships = await this.getUserOrganizations(user.id);

    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      imageUrl: user.imageUrl || undefined,
      // Attach first org info for convenience (optional)
      organizationId: memberships[0]?.organizationId,
      organizationRole: memberships[0]?.role as 'org:admin' | 'org:member' | undefined,
      isOrgAdmin: memberships.some(m => m.isAdmin),
      memberships, // full memberships array for guards
      publicMetadata: user.publicMetadata as { role?: 'admin' | 'user' | 'guest'; [key: string]: any } || {},
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new UnauthorizedException('Invalid or expired token');
  }
}


  async getUserById(userId: string): Promise<ClerkUser> {
    try {
      const user = await this.clerkClient.users.getUser(userId);

      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        imageUrl: user.imageUrl || undefined,
        publicMetadata: user.publicMetadata as { role?: 'admin' | 'user' | 'guest'; [key: string]: any } || {},
      };
    } catch (error) {
      console.error('Failed to fetch user:', error);
      throw new UnauthorizedException('User not found');
    }
  }

  async getUserOrganizations(userId: string) {
    try {
      const memberships = await this.clerkClient.users.getOrganizationMembershipList({ userId });
      console.log(`[ClerkService] User ${userId} memberships:`, JSON.stringify(memberships.data.map(m => ({
        orgId: m.organization.id,
        role: m.role,
      }))));
      return memberships.data.map(membership => ({
        organizationId: membership.organization.id,
        role: membership.role,
        isAdmin: membership.role === 'org:admin',
      }));
    } catch (error: any) {
      // Silently handle when organizations feature is not enabled
      if (error?.errors?.[0]?.code === 'organization_not_enabled_in_instance') {
        console.log('[ClerkService] Organizations feature not enabled');
        return [];
      }
      console.error('Failed to fetch user organizations:', error);
      return [];
    }
  }

  async updateUserMetadata(userId: string, metadata: Record<string, any>) {
    try {
      await this.clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: metadata,
      });
    } catch (error) {
      console.error('Failed to update user metadata:', error);
      throw new Error('Failed to update user metadata');
    }
  }

  /**
   * Get organization details from Clerk
   */
  async getOrganization(organizationId: string) {
    try {
      return await this.clerkClient.organizations.getOrganization({ organizationId });
    } catch (error) {
      console.error('Failed to fetch organization:', error);
      return null;
    }
  }

  /**
   * Get all members of an organization
   */
  async getOrganizationMembers(organizationId: string) {
    try {
      const members = await this.clerkClient.organizations.getOrganizationMembershipList({ 
        organizationId 
      });
      return members.data.map(member => ({
        userId: member.publicUserData?.userId || '',
        role: member.role,
        isAdmin: member.role === 'org:admin',
      }));
    } catch (error) {
      console.error('Failed to fetch organization members:', error);
      return [];
    }
  }

  /**
   * Check if user has specific role in organization
   */
  async userHasOrgRole(userId: string, organizationId: string, requiredRole: string): Promise<boolean> {
    const memberships = await this.getUserOrganizations(userId);
    const membership = memberships.find(m => m.organizationId === organizationId);
    
    if (!membership) return false;
    
    // org:admin has access to everything
    if (membership.role === 'org:admin') return true;
    
    return membership.role === requiredRole;
  }

  /**
   * Get user's role in a specific organization
   */
  async getUserOrgRole(userId: string, organizationId: string): Promise<string | null> {
    const memberships = await this.getUserOrganizations(userId);
    const membership = memberships.find(m => m.organizationId === organizationId);
    return membership?.role || null;
  }
}