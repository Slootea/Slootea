import { Module, Global } from '@nestjs/common';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { OrgRolesGuard } from './guards/org-roles.guard';
import { SystemAdminGuard } from './guards/system-admin.guard';
import { ClerkService } from './clerk.service';

@Global()
@Module({
  providers: [ClerkService, ClerkAuthGuard, OrgRolesGuard, SystemAdminGuard],
  exports: [ClerkService, ClerkAuthGuard, OrgRolesGuard, SystemAdminGuard],
})
export class AuthModule {}
