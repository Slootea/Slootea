import { SetMetadata } from '@nestjs/common';

export const ORG_ROLES_KEY = 'orgRoles';

/**
 * Decorator to specify required organization roles for a route
 * 
 * Usage:
 * @OrgRoles('org:admin') - Requires org admin role
 * @OrgRoles('org:admin', 'org:member') - Requires either admin or member role
 * 
 * Note: org:admin always has access to routes protected by this decorator
 */
export const OrgRoles = (...roles: string[]) => SetMetadata(ORG_ROLES_KEY, roles);

/**
 * Convenience decorators for common role requirements
 */
export const OrgAdminOnly = () => OrgRoles('org:admin');
export const OrgMemberOrAdmin = () => OrgRoles('org:admin', 'org:member');
