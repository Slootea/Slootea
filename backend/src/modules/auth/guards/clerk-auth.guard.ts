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
import { TtlCache } from '../../../common/utils/ttl-cache';

// Cache the DB user id for a (clerkId, activeOrgId) pair so we don't run an
// upsert on every authenticated request. TTL is short — webhook propagation or
// a re-login will refresh it within a minute.
const dbUserSyncCache = new TtlCache<string, string>(60 * 1000);

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

      // Sync user to database — but only when we don't have a fresh cached id
      // for this (clerkId, activeOrgId) pair.
      const cacheKey = `${user.id}|${organizationId ?? ''}`;
      let dbUserId = dbUserSyncCache.get(cacheKey);

      if (!dbUserId) {
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
          dbUserId = dbUser.id;
          dbUserSyncCache.set(cacheKey, dbUserId);
          this.logger.debug(`User ${user.id} synced to database with active org: ${organizationId}`);
        } catch (syncError) {
          // Authenticated in Clerk; allow the request but skip dbUserId.
          this.logger.error(
            `Failed to sync user ${user.id} to database: ${syncError.message}`,
            syncError.stack,
          );
        }
      }

      (request as any).user = {
        ...user,
        dbUserId,
        organizationId,
        orgRole,
      };
      (request as any).clerkUser = user;

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