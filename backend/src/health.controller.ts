import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint for Docker/load balancer' })
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
