import { Module, Global } from '@nestjs/common';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { OrgRolesGuard } from './guards/org-roles.guard';
import { ClerkService } from './clerk.service';

@Global()
@Module({
  providers: [ClerkService, ClerkAuthGuard, OrgRolesGuard],
  exports: [ClerkService, ClerkAuthGuard, OrgRolesGuard],
})
export class AuthModule {}
