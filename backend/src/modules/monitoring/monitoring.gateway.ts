import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { LogCaptureService, LogEntry } from './log-capture.service';
import { ActiveUsersService } from './active-users.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/monitoring',
})
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MonitoringGateway.name);
  private metricsInterval: NodeJS.Timeout | null = null;
  private adminClients: Set<string> = new Set();
  private logUnsubscribe: (() => void) | null = null;

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly logCaptureService: LogCaptureService,
    private readonly activeUsersService: ActiveUsersService,
  ) {}

  afterInit() {
    this.logger.log('Monitoring WebSocket Gateway initialized');
    
    // Subscribe to log events
    this.logUnsubscribe = this.logCaptureService.subscribe((log: LogEntry) => {
      this.broadcastToAdmins('log', log);
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.adminClients.delete(client.id);
    
    // Stop metrics broadcast if no admin clients
    if (this.adminClients.size === 0 && this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  @SubscribeMessage('subscribe:admin')
  handleAdminSubscribe(@ConnectedSocket() client: Socket) {
    this.adminClients.add(client.id);
    client.join('admin-monitoring');
    this.logger.log(`Admin subscribed: ${client.id}`);

    // Start metrics broadcast if first admin
    if (this.adminClients.size === 1 && !this.metricsInterval) {
      this.startMetricsBroadcast();
    }

    // Send initial data
    this.sendInitialData(client);

    return { success: true };
  }

  @SubscribeMessage('unsubscribe:admin')
  handleAdminUnsubscribe(@ConnectedSocket() client: Socket) {
    this.adminClients.delete(client.id);
    client.leave('admin-monitoring');
    this.logger.log(`Admin unsubscribed: ${client.id}`);

    if (this.adminClients.size === 0 && this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    return { success: true };
  }

  @SubscribeMessage('track:activity')
  handleTrackActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      sessionId: string;
      clerkUserId?: string;
      email?: string;
      name?: string;
      organizationId?: string;
      organizationName?: string;
      currentPath?: string;
    },
  ) {
    const userAgent = client.handshake.headers['user-agent'];
    const ip = client.handshake.address;

    this.activeUsersService.trackActivity(data.sessionId, {
      ...data,
      userAgent,
      ip,
    });

    // Broadcast updated active users to admins
    this.broadcastActiveUsers();

    return { success: true };
  }

  @SubscribeMessage('track:disconnect')
  handleTrackDisconnect(
    @MessageBody() data: { sessionId: string },
  ) {
    this.activeUsersService.removeUser(data.sessionId);
    this.broadcastActiveUsers();
    return { success: true };
  }

  @SubscribeMessage('frontend:log')
  handleFrontendLog(
    @MessageBody() data: {
      level: LogEntry['level'];
      context: string;
      message: string;
      metadata?: Record<string, any>;
    },
  ) {
    this.logCaptureService.addFrontendLog(
      data.level,
      data.context,
      data.message,
      data.metadata,
    );
    return { success: true };
  }

  private async sendInitialData(client: Socket) {
    try {
      // Send system metrics
      const metrics = await this.monitoringService.getSystemMetrics();
      client.emit('metrics', metrics);

      // Send recent logs
      const logs = this.logCaptureService.getLogs({ limit: 100 });
      client.emit('logs:initial', logs);

      // Send active users
      const activeUsers = this.activeUsersService.getActiveUsers();
      client.emit('activeUsers', activeUsers);

      // Send active users stats
      const stats = this.activeUsersService.getStats();
      client.emit('activeUsers:stats', stats);
    } catch (error) {
      this.logger.error('Failed to send initial data', error);
    }
  }

  private startMetricsBroadcast() {
    // Broadcast metrics every 2 seconds
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.monitoringService.getSystemMetrics();
        this.broadcastToAdmins('metrics', metrics);
      } catch (error) {
        this.logger.error('Failed to broadcast metrics', error);
      }
    }, 2000);
  }

  private broadcastToAdmins(event: string, data: any) {
    this.server.to('admin-monitoring').emit(event, data);
  }

  private broadcastActiveUsers() {
    const users = this.activeUsersService.getActiveUsers();
    const stats = this.activeUsersService.getStats();
    this.broadcastToAdmins('activeUsers', users);
    this.broadcastToAdmins('activeUsers:stats', stats);
  }

  onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.logUnsubscribe) {
      this.logUnsubscribe();
    }
  }
}
