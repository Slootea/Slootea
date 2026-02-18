import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ClerkService } from '../clerk.service';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private clerkService: ClerkService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    const organizationId = request.headers['x-organization-id'] as string | undefined;

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const user = await this.clerkService.verifyToken(token);
      
      // Determine organization role from memberships (Clerk is source of truth)
      let orgRole: string | undefined = undefined;
      if (organizationId && user.memberships) {
        const orgMembership = user.memberships.find(m => m.organizationId === organizationId);
        if (orgMembership) {
          orgRole = orgMembership.role;
        }
      }
      
      // Sync user to database on every authenticated request
      // Only sync the active organization ID, not the role
      // Role is always fetched from Clerk/user_organizations table
      try {
        const fullName = [user.firstName, user.lastName]
          .filter(Boolean)
          .join(' ') || user.email.split('@')[0];
        
        const dbUser = await this.usersService.upsertFromClerk(
          user.id,
          user.email,
          fullName,
          user.imageUrl,
          organizationId,
        );
        
        this.logger.debug(`User ${user.id} synced to database with active org: ${organizationId}`);
        
        // Attach both Clerk user info and DB user to request
        // orgRole comes from Clerk memberships, not from the database
        (request as any).user = { 
          ...user, 
          dbUserId: dbUser.id,
          organizationId,
          orgRole,
        };
        (request as any).clerkUser = user;
      } catch (syncError) {
        // Log the error but don't block the request
        // The user is authenticated in Clerk, so we allow access
        this.logger.error(
          `Failed to sync user ${user.id} to database: ${syncError.message}`,
          syncError.stack,
        );
        (request as any).user = { ...user, organizationId, orgRole };
        (request as any).clerkUser = user;
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}