import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

/**
 * SystemAdminGuard - Guards routes for system-wide administrators
 * 
 * This guard checks if the authenticated user has role: 'admin' in their 
 * Clerk public metadata. System admins have full access to all organizations
 * and system-wide settings.
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  private readonly logger = new Logger(SystemAdminGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('SystemAdminGuard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    // Check for admin role in publicMetadata
    const publicMetadata = user.publicMetadata || {};
    const role = publicMetadata.role;

    if (role !== 'admin') {
      this.logger.warn(
        `SystemAdminGuard: User ${user.id} attempted to access admin route without admin role. Current role: ${role}`,
      );
      throw new ForbiddenException('System administrator access required');
    }

    this.logger.debug(`SystemAdminGuard: User ${user.id} authorized as system admin`);
    return true;
  }
}
