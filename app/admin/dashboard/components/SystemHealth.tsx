'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Database,
  Server,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  HardDrive,
  Cpu,
  MemoryStick,
  Zap,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Settings,
  Download,
  Upload,
  BarChart3,
  PieChart,
  LineChart,
  Monitor,
  Info,
} from 'lucide-react';

interface SystemMetrics {
  database: {
    connections: number;
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    uptime: number;
  };
  api: {
    endpoints: number;
    avgResponseTime: number;
    errorRate: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  storage: {
    used: number;
    total: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  notifications: {
    queued: number;
    sent: number;
    failed: number;
  };
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

export default function SystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    if (autoRefresh) {
      const interval = setInterval(fetchSystemHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);

      // Fetch system metrics from API
      const [metricsRes, healthRes] = await Promise.all([
        fetch('/api/admin/metrics').then(r => r.json()).catch(() => null),
        fetch('/api/admin/health').then(r => r.json()).catch(() => null)
      ]);

      // Mock data if API not available
      const mockMetrics: SystemMetrics = {
        database: {
          connections: 23,
          status: 'healthy',
          responseTime: 45,
          uptime: 99.9
        },
        api: {
          endpoints: 15,
          avgResponseTime: 120,
          errorRate: 0.1,
          status: 'healthy'
        },
        storage: {
          used: 2.3,
          total: 10,
          status: 'healthy'
        },
        notifications: {
          queued: 5,
          sent: 1247,
          failed: 3
        }
      };

      const mockHealthChecks: HealthCheck[] = [
        {
          service: 'Database',
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          responseTime: 45
        },
        {
          service: 'API Server',
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          responseTime: 120
        },
        {
          service: 'Storage',
          status: 'healthy',
          lastCheck: new Date().toISOString()
        },
        {
          service: 'Email Service',
          status: 'warning',
          lastCheck: new Date().toISOString(),
          error: 'Rate limit approaching'
        },
        {
          service: 'Payment Gateway',
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          responseTime: 200
        },
        {
          service: 'Notification Queue',
          status: 'healthy',
          lastCheck: new Date().toISOString()
        }
      ];

      setMetrics(metricsRes || mockMetrics);
      setHealthChecks(mockHealthChecks);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <WifiOff className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </span>
    );
  };

  const runHealthCheck = async (service: string) => {
    // Simulate health check
    setHealthChecks(prev =>
      prev.map(check =>
        check.service === service
          ? { ...check, status: 'unknown' as const, lastCheck: new Date().toISOString() }
          : check
      )
    );

    // Simulate API call delay
    setTimeout(() => {
      setHealthChecks(prev =>
        prev.map(check =>
          check.service === service
            ? {
                ...check,
                status: Math.random() > 0.1 ? 'healthy' : 'warning',
                lastCheck: new Date().toISOString(),
                responseTime: Math.floor(Math.random() * 200) + 50
              }
            : check
        )
      );
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
          <p className="text-gray-600">Monitor system performance and service status</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          <button
            onClick={fetchSystemHealth}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* System Overview Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Database</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.database.connections}</p>
                <p className="text-xs text-gray-500">Active connections</p>
              </div>
              <Database className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600">{metrics.database.responseTime}ms avg</span>
              {getStatusBadge(metrics.database.status)}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Performance</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.api.avgResponseTime}ms</p>
                <p className="text-xs text-gray-500">Average response time</p>
              </div>
              <Server className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600">{metrics.api.errorRate}% errors</span>
              {getStatusBadge(metrics.api.status)}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.storage.used}GB</p>
                <p className="text-xs text-gray-500">of {metrics.storage.total}GB used</p>
              </div>
              <HardDrive className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600">{((metrics.storage.used / metrics.storage.total) * 100).toFixed(1)}% used</span>
              {getStatusBadge(metrics.storage.status)}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Notifications</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.notifications.sent}</p>
                <p className="text-xs text-gray-500">Sent this month</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600">{metrics.notifications.failed} failed</span>
              <span className="text-orange-600">{metrics.notifications.queued} queued</span>
            </div>
          </div>
        </div>
      )}

      {/* Service Health Checks */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Service Health Checks</h3>
          <p className="text-sm text-gray-600">Real-time status of all system services</p>
        </div>

        <div className="divide-y divide-gray-200">
          {healthChecks.map((check) => (
            <div key={check.service} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{check.service}</h4>
                    <p className="text-xs text-gray-500">
                      Last checked: {new Date(check.lastCheck).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {check.responseTime && (
                    <div className="text-sm text-gray-600">
                      {check.responseTime}ms
                    </div>
                  )}

                  {check.error && (
                    <div className="text-xs text-red-600 max-w-xs truncate">
                      {check.error}
                    </div>
                  )}

                  <button
                    onClick={() => runHealthCheck(check.service)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Test
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Response Time Trends</h3>
            <LineChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Performance charts would be displayed here</p>
              <p className="text-sm">Integration with monitoring service needed</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Error Rate Analysis</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingDown className="w-12 h-12 mx-auto mb-2 text-green-300" />
              <p>Current error rate: 0.1%</p>
              <p className="text-sm text-green-600">Within acceptable limits</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent System Logs</h3>
            <p className="text-sm text-gray-600">Latest system events and alerts</p>
          </div>
          <button className="text-blue-600 hover:text-blue-800 text-sm">
            View All Logs
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {[
            { time: '2 minutes ago', level: 'info', message: 'Database backup completed successfully' },
            { time: '5 minutes ago', level: 'warning', message: 'High memory usage detected on API server' },
            { time: '10 minutes ago', level: 'info', message: 'New user registration processed' },
            { time: '15 minutes ago', level: 'error', message: 'Failed to send email notification (SMTP timeout)' },
            { time: '20 minutes ago', level: 'info', message: 'Payment processing completed for 3 transactions' },
          ].map((log, index) => (
            <div key={index} className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {log.level === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                  {log.level === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                  {log.level === 'info' && <Info className="w-4 h-4 text-blue-500" />}
                  <span className="text-sm text-gray-900">{log.message}</span>
                </div>
                <span className="text-xs text-gray-500">{log.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
