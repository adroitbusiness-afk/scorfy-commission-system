'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  User,
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Database,
  Key,
  Mail,
  DollarSign,
  FileCheck,
  Trash2,
  Edit,
  Plus,
  Minus,
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_email: string;
  action: string;
  resource: string;
  resource_id: string;
  details: any;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure' | 'warning';
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('7d');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAuditLogs();
  }, [searchTerm, actionFilter, statusFilter, dateRange]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      // Mock audit logs data
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          user_id: 'user-1',
          user_email: 'admin@scorify.com',
          action: 'user_login',
          resource: 'auth',
          resource_id: 'session-123',
          details: { method: 'password', ip: '192.168.1.1' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          user_id: 'user-2',
          user_email: 'recruiter@institution.edu',
          action: 'application_approved',
          resource: 'leads',
          resource_id: 'app-456',
          details: { student_name: 'John Doe', program: 'Computer Science' },
          ip_address: '10.0.0.5',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          status: 'success'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          user_id: 'user-1',
          user_email: 'admin@scorify.com',
          action: 'user_role_changed',
          resource: 'profiles',
          resource_id: 'user-3',
          details: { old_role: 'student', new_role: 'recruiter', changed_by: 'admin@scorify.com' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'success'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          user_id: 'user-4',
          user_email: 'student@university.edu',
          action: 'payment_failed',
          resource: 'payments',
          resource_id: 'pay-789',
          details: { amount: 500, reason: 'insufficient_funds', gateway: 'stripe' },
          ip_address: '172.16.0.10',
          user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
          status: 'failure'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          user_id: 'user-1',
          user_email: 'admin@scorify.com',
          action: 'institution_suspended',
          resource: 'institutions',
          resource_id: 'inst-101',
          details: { reason: 'policy_violation', suspended_by: 'admin@scorify.com' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'warning'
        }
      ];

      // Apply filters
      let filteredLogs = mockLogs;

      if (actionFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.action === actionFilter);
      }

      if (statusFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.status === statusFilter);
      }

      if (searchTerm) {
        filteredLogs = filteredLogs.filter(log =>
          log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.resource.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply date range filter
      const now = new Date();
      const rangeMs = {
        '1h': 1000 * 60 * 60,
        '24h': 1000 * 60 * 60 * 24,
        '7d': 1000 * 60 * 60 * 24 * 7,
        '30d': 1000 * 60 * 60 * 24 * 30
      }[dateRange] || 1000 * 60 * 60 * 24 * 7;

      filteredLogs = filteredLogs.filter(log =>
        new Date(log.timestamp).getTime() > now.getTime() - rangeMs
      );

      setLogs(filteredLogs);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, any> = {
      user_login: User,
      user_logout: User,
      user_created: Plus,
      user_updated: Edit,
      user_deleted: Trash2,
      user_role_changed: Shield,
      application_submitted: FileCheck,
      application_approved: CheckCircle,
      application_rejected: XCircle,
      payment_processed: DollarSign,
      payment_failed: XCircle,
      institution_created: Plus,
      institution_updated: Edit,
      institution_suspended: AlertTriangle,
      institution_activated: CheckCircle,
      email_sent: Mail,
      settings_changed: Settings,
      data_exported: Download,
    };

    const Icon = iconMap[action] || Info;
    return <Icon className="w-4 h-4" />;
  };

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('approved') || action.includes('activated')) {
      return 'text-green-600 bg-green-100';
    }
    if (action.includes('deleted') || action.includes('rejected') || action.includes('failed') || action.includes('suspended')) {
      return 'text-red-600 bg-red-100';
    }
    if (action.includes('updated') || action.includes('changed')) {
      return 'text-blue-600 bg-blue-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failure': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failure': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'Status', 'IP Address', 'Details'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.user_email,
        log.action,
        log.resource,
        log.resource_id,
        log.status,
        log.ip_address,
        JSON.stringify(log.details)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-gray-600">Track all system activities and user actions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportLogs}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={fetchAuditLogs}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="user_login">User Login</option>
            <option value="user_created">User Created</option>
            <option value="user_updated">User Updated</option>
            <option value="application_approved">Application Approved</option>
            <option value="payment_processed">Payment Processed</option>
            <option value="institution_suspended">Institution Suspended</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="warning">Warning</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            {logs.length} logs found
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatAction(log.action)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.resource} • {log.resource_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.user_email}</div>
                      <div className="text-xs text-gray-500">{log.ip_address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{log.resource}</div>
                      <div className="text-xs text-gray-500 font-mono">{log.resource_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                        {getStatusIcon(log.status)}
                        <span className="ml-1 capitalize">{log.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleLogExpansion(log.id)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                      >
                        {expandedLogs.has(log.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {logs.length === 0 && !loading && (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No audit logs found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Expanded Log Details */}
      {logs.map((log) => (
        expandedLogs.has(log.id) && (
          <div key={`details-${log.id}`} className="bg-gray-50 p-6 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Event Details</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Event ID:</strong> {log.id}</div>
                  <div><strong>Timestamp:</strong> {new Date(log.timestamp).toLocaleString()}</div>
                  <div><strong>User ID:</strong> {log.user_id}</div>
                  <div><strong>IP Address:</strong> {log.ip_address}</div>
                  <div><strong>User Agent:</strong> {log.user_agent.substring(0, 50)}...</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Action Details</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Action:</strong> {formatAction(log.action)}</div>
                  <div><strong>Resource:</strong> {log.resource}</div>
                  <div><strong>Resource ID:</strong> {log.resource_id}</div>
                  <div><strong>Status:</strong> <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(log.status)}`}>{log.status}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold text-gray-900 mb-2">Additional Data</h4>
              <pre className="bg-white p-3 rounded text-xs text-gray-800 overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </div>
        )
      ))}
    </div>
  );
}