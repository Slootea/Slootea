import { Module, Global, OnModuleInit } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringGateway } from './monitoring.gateway';
import { LogCaptureService } from './log-capture.service';
import { ActiveUsersService } from './active-users.service';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    MonitoringGateway,
    LogCaptureService,
    ActiveUsersService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [MonitoringService, LogCaptureService, ActiveUsersService],
})
export class MonitoringModule implements OnModuleInit {
  constructor(private readonly logCaptureService: LogCaptureService) {}
  
  onModuleInit() {
    this.logCaptureService.addLog('log', 'MonitoringModule', 'Monitoring module initialized', 'backend');
    this.logCaptureService.addLog('log', 'Application', 'Server started successfully', 'backend');
  }
}
