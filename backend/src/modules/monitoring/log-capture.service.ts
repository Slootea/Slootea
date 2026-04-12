import { Injectable } from '@nestjs/common';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'log' | 'error' | 'warn' | 'debug' | 'verbose';
  context: string;
  message: string;
  source: 'backend' | 'frontend' | 'database';
  metadata?: Record<string, any>;
}

@Injectable()
export class LogCaptureService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;
  private logIdCounter = 0;
  private listeners: Set<(log: LogEntry) => void> = new Set();

  addLog(
    level: LogEntry['level'],
    context: string,
    message: string,
    source: LogEntry['source'] = 'backend',
    metadata?: Record<string, any>,
  ): LogEntry {
    const entry: LogEntry = {
      id: `log-${++this.logIdCounter}`,
      timestamp: new Date(),
      level,
      context,
      message,
      source,
      metadata,
    };

    this.logs.push(entry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch {
        // Ignore listener errors
      }
    });

    return entry;
  }

  addFrontendLog(
    level: LogEntry['level'],
    context: string,
    message: string,
    metadata?: Record<string, any>,
  ): LogEntry {
    return this.addLog(level, context, message, 'frontend', metadata);
  }

  addDatabaseLog(
    level: LogEntry['level'],
    message: string,
    metadata?: Record<string, any>,
  ): LogEntry {
    return this.addLog(level, 'Database', message, 'database', metadata);
  }

  getLogs(options?: {
    limit?: number;
    source?: LogEntry['source'];
    level?: LogEntry['level'];
    since?: Date;
    search?: string;
  }): LogEntry[] {
    let filtered = [...this.logs];

    if (options?.source) {
      filtered = filtered.filter(log => log.source === options.source);
    }

    if (options?.level) {
      filtered = filtered.filter(log => log.level === options.level);
    }

    if (options?.since) {
      const since = options.since;
      filtered = filtered.filter(log => log.timestamp >= since);
    }

    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(
        log =>
          log.message.toLowerCase().includes(searchLower) ||
          log.context.toLowerCase().includes(searchLower),
      );
    }

    // Return most recent first
    filtered = filtered.reverse();

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  clearLogs(): void {
    this.logs = [];
  }

  subscribe(listener: (log: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getStats(): {
    total: number;
    bySource: Record<string, number>;
    byLevel: Record<string, number>;
  } {
    const bySource: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    this.logs.forEach(log => {
      bySource[log.source] = (bySource[log.source] || 0) + 1;
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    });

    return {
      total: this.logs.length,
      bySource,
      byLevel,
    };
  }
}
