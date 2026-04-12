import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LogCaptureService } from './log-capture.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly logCaptureService: LogCaptureService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;
    const now = Date.now();

    // Log incoming request
    this.logCaptureService.addLog(
      'log',
      'HTTP',
      `→ ${method} ${url}`,
      'backend',
      { userAgent, ip, body: method !== 'GET' ? body : undefined },
    );

    return next.handle().pipe(
      tap((response) => {
        const statusCode = context.switchToHttp().getResponse().statusCode;
        const duration = Date.now() - now;

        this.logCaptureService.addLog(
          'log',
          'HTTP',
          `← ${method} ${url} ${statusCode} ${duration}ms`,
          'backend',
          { duration, statusCode },
        );
      }),
      catchError((error) => {
        const duration = Date.now() - now;
        const statusCode = error.status || 500;

        this.logCaptureService.addLog(
          'error',
          'HTTP',
          `← ${method} ${url} ${statusCode} ${duration}ms - ${error.message}`,
          'backend',
          { duration, statusCode, error: error.message, stack: error.stack },
        );

        throw error;
      }),
    );
  }
}
