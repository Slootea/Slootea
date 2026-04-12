import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MonitoringService, SystemMetrics } from './monitoring.service';
import { LogCaptureService, LogEntry } from './log-capture.service';
import { ActiveUsersService, ActiveUser } from './active-users.service';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('monitoring')
@UseGuards(ClerkAuthGuard, SystemAdminGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly logCaptureService: LogCaptureService,
    private readonly activeUsersService: ActiveUsersService,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get current system metrics' })
  async getMetrics(): Promise<SystemMetrics> {
    return this.monitoringService.getSystemMetrics();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get recent logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false, enum: ['backend', 'frontend', 'database'] })
  @ApiQuery({ name: 'level', required: false, enum: ['log', 'error', 'warn', 'debug', 'verbose'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getLogs(
    @Query('limit') limit?: number,
    @Query('source') source?: LogEntry['source'],
    @Query('level') level?: LogEntry['level'],
    @Query('search') search?: string,
  ): Promise<LogEntry[]> {
    return this.logCaptureService.getLogs({
      limit: limit ? parseInt(String(limit), 10) : 100,
      source,
      level,
      search,
    });
  }

  @Get('logs/stats')
  @ApiOperation({ summary: 'Get log statistics' })
  async getLogStats() {
    return this.logCaptureService.getStats();
  }

  @Delete('logs')
  @ApiOperation({ summary: 'Clear all logs' })
  async clearLogs() {
    this.logCaptureService.clearLogs();
    return { success: true, message: 'Logs cleared' };
  }

  @Get('active-users')
  @ApiOperation({ summary: 'Get active users' })
  async getActiveUsers(): Promise<ActiveUser[]> {
    return this.activeUsersService.getActiveUsers();
  }

  @Get('active-users/stats')
  @ApiOperation({ summary: 'Get active users statistics' })
  async getActiveUsersStats() {
    return this.activeUsersService.getStats();
  }

  @Post('logs/frontend')
  @ApiOperation({ summary: 'Submit frontend log' })
  async submitFrontendLog(
    @Body() body: {
      level: LogEntry['level'];
      context: string;
      message: string;
      metadata?: Record<string, any>;
    },
  ): Promise<LogEntry> {
    return this.logCaptureService.addFrontendLog(
      body.level,
      body.context,
      body.message,
      body.metadata,
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  async healthCheck() {
    const metrics = await this.monitoringService.getSystemMetrics();
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: metrics.process.uptime,
      memory: {
        used: this.monitoringService.formatBytes(metrics.process.memoryUsage.heapUsed),
        total: this.monitoringService.formatBytes(metrics.process.memoryUsage.heapTotal),
      },
    };
  }
}
