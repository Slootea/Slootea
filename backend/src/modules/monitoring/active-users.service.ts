import { Injectable } from '@nestjs/common';

export interface ActiveUser {
  id: string;
  clerkUserId?: string;
  email?: string;
  name?: string;
  organizationId?: string;
  organizationName?: string;
  lastActivity: Date;
  currentPath?: string;
  userAgent?: string;
  ip?: string;
  isAnonymous: boolean;
}

@Injectable()
export class ActiveUsersService {
  private activeUsers: Map<string, ActiveUser> = new Map();
  private readonly inactivityTimeout = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup inactive users every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveUsers();
    }, 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  trackActivity(
    sessionId: string,
    data: Partial<Omit<ActiveUser, 'id' | 'lastActivity'>>,
  ): ActiveUser {
    const existing = this.activeUsers.get(sessionId);
    
    const user: ActiveUser = {
      id: sessionId,
      clerkUserId: data.clerkUserId || existing?.clerkUserId,
      email: data.email || existing?.email,
      name: data.name || existing?.name,
      organizationId: data.organizationId || existing?.organizationId,
      organizationName: data.organizationName || existing?.organizationName,
      currentPath: data.currentPath || existing?.currentPath,
      userAgent: data.userAgent || existing?.userAgent,
      ip: data.ip || existing?.ip,
      isAnonymous: data.clerkUserId ? false : (existing?.isAnonymous ?? true),
      lastActivity: new Date(),
    };

    this.activeUsers.set(sessionId, user);
    return user;
  }

  removeUser(sessionId: string): void {
    this.activeUsers.delete(sessionId);
  }

  getActiveUsers(): ActiveUser[] {
    return Array.from(this.activeUsers.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  getActiveUserCount(): number {
    return this.activeUsers.size;
  }

  getAuthenticatedUserCount(): number {
    return Array.from(this.activeUsers.values())
      .filter(u => !u.isAnonymous).length;
  }

  getAnonymousUserCount(): number {
    return Array.from(this.activeUsers.values())
      .filter(u => u.isAnonymous).length;
  }

  getUsersByOrganization(): Record<string, number> {
    const byOrg: Record<string, number> = {};
    
    this.activeUsers.forEach(user => {
      const orgKey = user.organizationId || 'no-org';
      byOrg[orgKey] = (byOrg[orgKey] || 0) + 1;
    });

    return byOrg;
  }

  getUsersByPath(): Record<string, number> {
    const byPath: Record<string, number> = {};
    
    this.activeUsers.forEach(user => {
      if (user.currentPath) {
        // Normalize path (remove query params, IDs)
        const normalizedPath = this.normalizePath(user.currentPath);
        byPath[normalizedPath] = (byPath[normalizedPath] || 0) + 1;
      }
    });

    return byPath;
  }

  private normalizePath(path: string): string {
    // Remove query params
    const pathOnly = path.split('?')[0];
    // Replace UUIDs with :id
    return pathOnly.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id'
    );
  }

  private cleanupInactiveUsers(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.activeUsers.forEach((user, sessionId) => {
      if (now - user.lastActivity.getTime() > this.inactivityTimeout) {
        toRemove.push(sessionId);
      }
    });

    toRemove.forEach(sessionId => this.activeUsers.delete(sessionId));
  }

  getStats(): {
    total: number;
    authenticated: number;
    anonymous: number;
    byOrganization: Record<string, number>;
    byPath: Record<string, number>;
  } {
    return {
      total: this.getActiveUserCount(),
      authenticated: this.getAuthenticatedUserCount(),
      anonymous: this.getAnonymousUserCount(),
      byOrganization: this.getUsersByOrganization(),
      byPath: this.getUsersByPath(),
    };
  }
}
