"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Monitor, 
  Network, 
  Users, 
  FileText,
  RefreshCw,
  Trash2,
  Search,
  Clock,
  Server,
  Globe,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Bug,
} from "lucide-react";
import { adminApi, SystemMetrics, LogEntry, ActiveUser, ActiveUsersStats, LogStats } from "@/lib/admin-api";
import { io, Socket } from "socket.io-client";
import { formatDistanceToNow } from "date-fns";

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '< 1m';
}

function LogLevelBadge({ level }: { level: LogEntry['level'] }) {
  const variants: Record<string, { color: string; icon: React.ReactNode }> = {
    error: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: <AlertCircle className="h-3 w-3" /> },
    warn: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: <AlertTriangle className="h-3 w-3" /> },
    log: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: <Info className="h-3 w-3" /> },
    debug: { color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: <Bug className="h-3 w-3" /> },
    verbose: { color: "bg-gray-500/10 text-gray-500 border-gray-500/20", icon: <FileText className="h-3 w-3" /> },
  };
  
  const { color, icon } = variants[level] || variants.log;
  
  return (
    <Badge variant="outline" className={`${color} flex items-center gap-1 font-mono text-xs`}>
      {icon}
      {level.toUpperCase()}
    </Badge>
  );
}

function SourceBadge({ source }: { source: LogEntry['source'] }) {
  const colors: Record<string, string> = {
    backend: "bg-green-500/10 text-green-500 border-green-500/20",
    frontend: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    database: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };
  
  return (
    <Badge variant="outline" className={`${colors[source] || colors.backend} font-mono text-xs`}>
      {source}
    </Badge>
  );
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [activeUsersStats, setActiveUsersStats] = useState<ActiveUsersStats | null>(null);
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logFilter, setLogFilter] = useState<{ source?: string; level?: string; search?: string }>({});
  const [autoScroll, setAutoScroll] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const connectWebSocket = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${apiUrl}/monitoring`, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe:admin');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('metrics', (data: SystemMetrics) => {
      setMetrics(data);
    });

    socket.on('logs:initial', (data: LogEntry[]) => {
      setLogs(data);
    });

    socket.on('log', (log: LogEntry) => {
      setLogs(prev => [log, ...prev].slice(0, 500));
    });

    socket.on('activeUsers', (data: ActiveUser[]) => {
      setActiveUsers(data);
    });

    socket.on('activeUsers:stats', (data: ActiveUsersStats) => {
      setActiveUsersStats(data);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('unsubscribe:admin');
      socket.disconnect();
    };
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [metricsRes, logsRes, activeUsersRes, activeUsersStatsRes, logStatsRes] = await Promise.all([
        adminApi.getSystemMetrics(),
        adminApi.getLogs({ limit: 100 }),
        adminApi.getActiveUsers(),
        adminApi.getActiveUsersStats(),
        adminApi.getLogStats(),
      ]);
      
      setMetrics(metricsRes.data);
      setLogs(logsRes.data);
      setActiveUsers(activeUsersRes.data);
      setActiveUsersStats(activeUsersStatsRes.data);
      setLogStats(logStatsRes.data);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    const cleanup = connectWebSocket();
    
    return () => {
      cleanup();
    };
  }, [loadInitialData, connectWebSocket]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClearLogs = async () => {
    try {
      await adminApi.clearLogs();
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter.source && log.source !== logFilter.source) return false;
    if (logFilter.level && log.level !== logFilter.level) return false;
    if (logFilter.search) {
      const searchLower = logFilter.search.toLowerCase();
      if (!log.message.toLowerCase().includes(searchLower) && 
          !log.context.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time server metrics, logs, and active users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
            {isConnected ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {isConnected ? "Live" : "Disconnected"}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadInitialData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            System Metrics
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Logs
            {logStats && logStats.byLevel.error && (
              <Badge variant="destructive" className="ml-1 h-5 px-1">{logStats.byLevel.error}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Active Users
            {activeUsersStats && (
              <Badge variant="secondary" className="ml-1 h-5 px-1">{activeUsersStats.total}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* System Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <>
              {/* OS & Server Info */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      Server
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{metrics.os.hostname}</div>
                    <p className="text-xs text-muted-foreground">
                      {metrics.os.distro} {metrics.os.release}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      System Uptime
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{formatUptime(metrics.os.uptime)}</div>
                    <p className="text-xs text-muted-foreground">
                      Process: {formatUptime(metrics.process.uptime)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Node.js
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{metrics.process.nodeVersion}</div>
                    <p className="text-xs text-muted-foreground">PID: {metrics.process.pid}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      Architecture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{metrics.os.arch}</div>
                    <p className="text-xs text-muted-foreground">{metrics.os.kernel}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Resource Usage */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* CPU */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        CPU Usage
                      </span>
                      <span className="text-2xl font-bold">{metrics.cpu.usage.toFixed(1)}%</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={metrics.cpu.usage} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <p className="font-medium truncate">{metrics.cpu.model}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cores:</span>
                        <p className="font-medium">{metrics.cpu.cores}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Speed:</span>
                        <p className="font-medium">{metrics.cpu.speed} GHz</p>
                      </div>
                      {metrics.cpu.temperature && (
                        <div>
                          <span className="text-muted-foreground">Temp:</span>
                          <p className="font-medium">{metrics.cpu.temperature}°C</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Memory */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MemoryStick className="h-4 w-4 text-muted-foreground" />
                        Memory Usage
                      </span>
                      <span className="text-2xl font-bold">{metrics.memory.usagePercent.toFixed(1)}%</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={metrics.memory.usagePercent} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Used:</span>
                        <p className="font-medium">{formatBytes(metrics.memory.used)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <p className="font-medium">{formatBytes(metrics.memory.total)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Free:</span>
                        <p className="font-medium">{formatBytes(metrics.memory.free)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Heap:</span>
                        <p className="font-medium">{formatBytes(metrics.process.memoryUsage.heapUsed)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Disk */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        Disk Usage
                      </span>
                      <span className="text-2xl font-bold">{metrics.disk.usagePercent.toFixed(1)}%</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={metrics.disk.usagePercent} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Used:</span>
                        <p className="font-medium">{formatBytes(metrics.disk.used)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <p className="font-medium">{formatBytes(metrics.disk.total)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Free:</span>
                        <p className="font-medium">{formatBytes(metrics.disk.free)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mounts:</span>
                        <p className="font-medium">{metrics.disk.devices.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Network */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Network className="h-4 w-4 text-muted-foreground" />
                    Network Interfaces
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {metrics.network.interfaces.map((iface) => (
                      <div key={iface.name} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{iface.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {iface.ip4 || 'No IP'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>↓ {formatBytes(iface.rx_sec)}/s</div>
                          <div>↑ {formatBytes(iface.tx_sec)}/s</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Disk Mounts */}
              {metrics.disk.devices.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      Disk Partitions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.disk.devices.map((device) => (
                        <div key={device.mount} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{device.mount}</span>
                            <span className="text-muted-foreground">
                              {formatBytes(device.used)} / {formatBytes(device.size)}
                            </span>
                          </div>
                          <Progress value={device.usagePercent} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Log Stream</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant={autoScroll ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoScroll(!autoScroll)}
                  >
                    Auto-scroll
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClearLogs}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    className="pl-8"
                    value={logFilter.search || ''}
                    onChange={(e) => setLogFilter(prev => ({ ...prev, search: e.target.value }))}
                  />
                </div>
                <Select
                  value={logFilter.source || 'all'}
                  onValueChange={(value) => setLogFilter(prev => ({ ...prev, source: value === 'all' ? undefined : value }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={logFilter.level || 'all'}
                  onValueChange={(value) => setLogFilter(prev => ({ ...prev, level: value === 'all' ? undefined : value }))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warn</SelectItem>
                    <SelectItem value="log">Log</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="verbose">Verbose</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] rounded border bg-muted/30">
                <div className="p-2 space-y-1 font-mono text-xs">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No logs to display
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 px-2 py-1 rounded hover:bg-muted/50"
                      >
                        <span className="text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <LogLevelBadge level={log.level} />
                        <SourceBadge source={log.source} />
                        <span className="text-muted-foreground">[{log.context}]</span>
                        <span className="flex-1 break-all">{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {activeUsersStats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{activeUsersStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Authenticated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{activeUsersStats.authenticated}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Anonymous</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-muted-foreground">{activeUsersStats.anonymous}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <CardDescription>Real-time view of active users on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {activeUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active users at the moment
                </div>
              ) : (
                <div className="space-y-2">
                  {activeUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.name || user.email || (user.isAnonymous ? 'Anonymous' : 'Unknown')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.currentPath || 'Unknown page'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {user.organizationName && (
                          <Badge variant="outline" className="mb-1">{user.organizationName}</Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {activeUsersStats && Object.keys(activeUsersStats.byPath).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Users by Page</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(activeUsersStats.byPath)
                    .sort(([, a], [, b]) => b - a)
                    .map(([path, count]) => (
                      <div key={path} className="flex items-center justify-between">
                        <span className="text-sm font-mono truncate">{path}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
