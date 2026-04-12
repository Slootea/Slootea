import { Injectable, Logger } from '@nestjs/common';
import * as si from 'systeminformation';

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    speed: number;
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
    devices: Array<{
      mount: string;
      type: string;
      size: number;
      used: number;
      usagePercent: number;
    }>;
  };
  network: {
    interfaces: Array<{
      name: string;
      ip4: string;
      ip6: string;
      rx_sec: number;
      tx_sec: number;
    }>;
  };
  os: {
    platform: string;
    distro: string;
    release: string;
    kernel: string;
    arch: string;
    hostname: string;
    uptime: number;
  };
  process: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    pid: number;
    nodeVersion: string;
  };
  timestamp: Date;
}

export interface DatabaseMetrics {
  status: 'connected' | 'disconnected' | 'error';
  connectionPool?: {
    total: number;
    idle: number;
    used: number;
  };
  responseTime?: number;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      const [cpu, cpuLoad, mem, disk, fsSize, networkInterfaces, networkStats, osInfo, time] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
        si.mem(),
        si.diskLayout(),
        si.fsSize(),
        si.networkInterfaces(),
        si.networkStats(),
        si.osInfo(),
        si.time(),
      ]);

      // Try to get CPU temperature (may not be available on all systems)
      let cpuTemp: number | undefined;
      try {
        const temp = await si.cpuTemperature();
        cpuTemp = temp.main || undefined;
      } catch {
        // Temperature not available
      }

      const interfaces = Array.isArray(networkInterfaces) ? networkInterfaces : [];
      const stats = Array.isArray(networkStats) ? networkStats : [];

      return {
        cpu: {
          usage: cpuLoad.currentLoad || 0,
          cores: cpu.cores,
          model: cpu.manufacturer + ' ' + cpu.brand,
          speed: cpu.speed,
          temperature: cpuTemp,
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usagePercent: (mem.used / mem.total) * 100,
        },
        disk: {
          total: fsSize.reduce((acc, fs) => acc + fs.size, 0),
          used: fsSize.reduce((acc, fs) => acc + fs.used, 0),
          free: fsSize.reduce((acc, fs) => acc + (fs.size - fs.used), 0),
          usagePercent: fsSize.length > 0 
            ? (fsSize.reduce((acc, fs) => acc + fs.used, 0) / fsSize.reduce((acc, fs) => acc + fs.size, 0)) * 100 
            : 0,
          devices: fsSize.map(fs => ({
            mount: fs.mount,
            type: fs.type,
            size: fs.size,
            used: fs.used,
            usagePercent: fs.use,
          })),
        },
        network: {
          interfaces: interfaces
            .filter((iface: any) => !iface.internal)
            .map((iface: any) => {
              const stat = stats.find((s: any) => s.iface === iface.iface);
              return {
                name: iface.iface,
                ip4: iface.ip4 || '',
                ip6: iface.ip6 || '',
                rx_sec: stat?.rx_sec || 0,
                tx_sec: stat?.tx_sec || 0,
              };
            }),
        },
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          kernel: osInfo.kernel,
          arch: osInfo.arch,
          hostname: osInfo.hostname,
          uptime: time.uptime,
        },
        process: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          pid: process.pid,
          nodeVersion: process.version,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to collect system metrics', error);
      throw error;
    }
  }

  formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let value = bytes;
    
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    
    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }
}
