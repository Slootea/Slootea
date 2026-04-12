import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import { LogCaptureService, LogEntry } from './log-capture.service';

@Injectable({ scope: Scope.TRANSIENT })
export class MonitoringLogger extends ConsoleLogger {
  constructor(private readonly logCaptureService: LogCaptureService) {
    super();
  }

  log(message: any, context?: string) {
    super.log(message, context);
    this.captureLog('log', message, context);
  }

  error(message: any, stack?: string, context?: string) {
    super.error(message, stack, context);
    this.captureLog('error', message, context, { stack });
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.captureLog('warn', message, context);
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
    this.captureLog('debug', message, context);
  }

  verbose(message: any, context?: string) {
    super.verbose(message, context);
    this.captureLog('verbose', message, context);
  }

  private captureLog(
    level: LogEntry['level'],
    message: any,
    context?: string,
    metadata?: Record<string, any>,
  ) {
    if (this.logCaptureService) {
      const messageStr = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      this.logCaptureService.addLog(
        level,
        context || 'Application',
        messageStr,
        'backend',
        metadata,
      );
    }
  }
}
