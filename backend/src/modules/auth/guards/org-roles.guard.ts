import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator';

/**
 * Guard that checks if the user has the required organization role
 * Must be used after ClerkAuthGuard
 * 
 * This guard checks the user's Clerk organization memberships to verify
 * they have the required role in the current organization context.
 */
@Injectable()
export class OrgRolesGuard implements CanActivate {
  private readonly logger = new Logger(OrgRolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get organization ID from request header, query, or body
    const organizationId = this.extractOrganizationId(request);

    if (!organizationId) {
      this.logger.warn('No organization context provided');
      // If no org context and roles are required, deny access
      throw new ForbiddenException('Organization context required');
    }

    // Check if user has required role in the organization
    const hasRole = this.checkUserOrgRole(user, organizationId, requiredRoles);

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    // Attach organization context to request for downstream use
    request.organizationId = organizationId;
    request.userOrgRole = this.getUserOrgRole(user, organizationId);

    return true;
  }

  private extractOrganizationId(request: any): string | null {
    // Priority order: header > route param > query > body
    return (
      request.headers['x-organization-id'] ||
      request.params?.organizationId ||
      request.query?.organizationId ||
      request.body?.organizationId ||
      null
    );
  }

  private checkUserOrgRole(
    user: any,
    organizationId: string,
    requiredRoles: string[],
  ): boolean {
    if (!user.memberships || !Array.isArray(user.memberships)) {
      return false;
    }

    const membership = user.memberships.find(
      (m: any) => m.organizationId === organizationId,
    );

    if (!membership) {
      return false;
    }

    // org:admin always has access
    if (membership.role === 'org:admin') {
      return true;
    }

    // Check if user's role matches any of the required roles
    return requiredRoles.includes(membership.role);
  }

  private getUserOrgRole(user: any, organizationId: string): string | null {
    if (!user.memberships || !Array.isArray(user.memberships)) {
      return null;
    }

    const membership = user.memberships.find(
      (m: any) => m.organizationId === organizationId,
    );

    return membership?.role || null;
  }
}
