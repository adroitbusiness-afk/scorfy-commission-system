'use client';

import { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  Minus,
  Edit,
  Trash2,
  Mail,
  DollarSign,
  FileCheck,
  Settings,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: any;
  new_data: any;
  ip_address: string;
  user_agent: string;
  // Joined fields
  user_email?: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState('7d');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    fetchAuditLogs();
  }, [searchTerm, actionFilter, dateRange, page]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('audit_logs')
        .select('*, profiles!user_id(email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Apply action filter
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      // Apply date range
      const now = new Date();
      const rangeDays = { '1h': 1/24, '24h': 1, '7d': 7, '30d': 30 }[dateRange] || 7;
      const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', startDate);

      // Apply search (user email or action or table)
      if (searchTerm) {
        // Search across multiple fields using OR – Supabase JS doesn't support OR directly, we'll filter after
        // For simplicity, we'll fetch and filter client-side, but for large data better to use a view or text search.
        // Here we'll keep it simple: fetch all within range and filter client-side.
        // Since we already have date range and action filters, this is acceptable for demo.
      }

      const { data, error, count } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply search client-side (simple)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(log =>
          (log.profiles?.email?.toLowerCase().includes(term)) ||
          log.action.toLowerCase().includes(term) ||
          log.table_name.toLowerCase().includes(term) ||
          (log.record_id && log.record_id.toLowerCase().includes(term))
        );
      }

      // Transform to include user_email
      const transformed = filteredData.map(log => ({
        ...log,
        user_email: log.profiles?.email || 'Unknown',
      }));

      setLogs(transformed);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Table', 'Record ID', 'IP Address', 'Old Data', 'New Data'].join(','),
      ...logs.map(log => [
        log.created_at,
        log.user_email,
        log.action,
        log.table_name,
        log.record_id,
        log.ip_address,
        JSON.stringify(log.old_data).replace(/,/g, ';'),
        JSON.stringify(log.new_data).replace(/,/g, ';'),
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

  const getStatusFromAction = (action: string): 'success' | 'failure' | 'warning' => {
    if (action.includes('failed') || action.includes('rejected') || action.includes('suspended')) return 'failure';
    if (action.includes('warning')) return 'warning';
    return 'success';
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
    if (newExpanded.has(logId)) newExpanded.delete(logId);
    else newExpanded.add(logId);
    setExpandedLogs(newExpanded);
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-gray-600">Complete history of all system events</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={exportLogs} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Download className="w-4 h-4" /><span>Export CSV</span>
          </button>
          <button onClick={fetchAuditLogs} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <RefreshCw className="w-4 h-4" /><span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input type="text" placeholder="Search by user, action, table..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
          </div>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="all">All Actions</option>
            <option value="user_login">User Login</option>
            <option value="user_created">User Created</option>
            <option value="user_updated">User Updated</option>
            <option value="user_deleted">User Deleted</option>
            <option value="application_approved">Application Approved</option>
            <option value="payment_processed">Payment Processed</option>
            <option value="institution_suspended">Institution Suspended</option>
          </select>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <div className="text-sm text-gray-600 flex items-center">{logs.length} logs shown (total {totalCount})</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" /><p>Loading audit logs...</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map(log => {
                  const status = getStatusFromAction(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>{getActionIcon(log.action)}</div>
                          <div><div className="text-sm font-medium text-gray-900">{formatAction(log.action)}</div><div className="text-xs text-gray-500">{log.table_name}</div></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{log.user_email}</div><div className="text-xs text-gray-500">{log.ip_address || 'N/A'}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{log.table_name}</div><div className="text-xs font-mono text-gray-500">{log.record_id}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>{getStatusIcon(status)}<span className="ml-1 capitalize">{status}</span></span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><div className="flex items-center"><Clock className="w-4 h-4 mr-1" />{new Date(log.created_at).toLocaleString()}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-right"><button onClick={() => toggleLogExpansion(log.id)} className="text-blue-600 hover:text-blue-900">{expandedLogs.has(log.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {logs.length === 0 && !loading && (
          <div className="p-8 text-center"><FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900">No audit logs found</h3><p className="text-gray-500">Try adjusting your filters.</p></div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white p-4 rounded shadow">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Expanded Details */}
      {logs.map(log => expandedLogs.has(log.id) && (
        <div key={`details-${log.id}`} className="bg-gray-50 p-6 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><h4 className="font-semibold mb-2">Event Metadata</h4><div className="space-y-1 text-sm"><div><strong>ID:</strong> {log.id}</div><div><strong>Timestamp:</strong> {new Date(log.created_at).toLocaleString()}</div><div><strong>User ID:</strong> {log.user_id}</div><div><strong>IP:</strong> {log.ip_address || 'N/A'}</div><div><strong>User Agent:</strong> {log.user_agent?.substring(0, 80)}...</div></div></div>
            <div><h4 className="font-semibold mb-2">Change Data</h4><div className="space-y-1 text-sm"><div><strong>Table:</strong> {log.table_name}</div><div><strong>Record ID:</strong> {log.record_id}</div><div><strong>Action:</strong> {formatAction(log.action)}</div></div></div>
          </div>
          <div className="mt-4"><h4 className="font-semibold mb-2">Before / After</h4><pre className="bg-white p-3 rounded text-xs overflow-x-auto"><strong>Old:</strong> {JSON.stringify(log.old_data, null, 2)}<br/><strong>New:</strong> {JSON.stringify(log.new_data, null, 2)}</pre></div>
        </div>
      ))}
    </div>
  );
}