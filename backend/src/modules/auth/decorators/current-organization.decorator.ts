import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current organization ID from the request
 * The organization ID is typically set by the OrgRolesGuard or extracted from headers
 * 
 * Usage:
 * @Get()
 * findAll(@CurrentOrganization() orgId: string) {
 *   // orgId is the current organization context
 * }
 */
export const CurrentOrganization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    
    // Return organization ID from request (set by guard or extracted)
    return (
      request.organizationId ||
      request.headers['x-organization-id'] ||
      request.query?.organizationId ||
      null
    );
  },
);

/**
 * Decorator to extract the user's role in the current organization
 * 
 * Usage:
 * @Get()
 * findAll(@CurrentOrgRole() role: string) {
 *   // role is 'org:admin' or 'org:member'
 * }
 */
export const CurrentOrgRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.userOrgRole || null;
  },
);

/**
 * Decorator to check if current user is org admin
 * 
 * Usage:
 * @Get()
 * findAll(@IsOrgAdmin() isAdmin: boolean) {
 *   if (isAdmin) {
 *     // Admin-specific logic
 *   }
 * }
 */
export const IsOrgAdmin = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    return request.userOrgRole === 'org:admin';
  },
);
