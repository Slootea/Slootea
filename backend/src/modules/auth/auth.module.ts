import { Module, Global } from '@nestjs/common';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { ClerkService } from './clerk.service';

@Global()
@Module({
  providers: [ClerkService, ClerkAuthGuard],
  exports: [ClerkService, ClerkAuthGuard],
})
export class AuthModule {}
