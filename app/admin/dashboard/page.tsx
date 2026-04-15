'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import {
  Shield,
  Users,
  Building2,
  FileText,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Database,
  Server,
  Settings,
  UserCheck,
  BarChart3,
  Zap,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Globe,
  Mail,
  MessageSquare,
  CreditCard,
  Award,
  Calendar,
  BookOpen,
  Home,
  FileCheck,
  GraduationCap,
  Target,
  PieChart,
  LineChart,
  Monitor,
  HardDrive,
  Wifi,
  WifiOff,
  AlertCircle,
  Info,
  X,
  Search,
  Filter,
  Download,
  Upload,
  Lock,
  Unlock,
  UserX,
  UserPlus,
  Crown,
  Key,
  Bell,
  Archive,
  Star,
  Flag,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Check,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Save,
  Loader2,
} from 'lucide-react';

// Lazy load admin components
const UserManagement = dynamic(() => import('./components/UserManagement'));
const InstitutionManagement = dynamic(() => import('./components/InstitutionManagement'));
const SystemHealth = dynamic(() => import('./components/SystemHealth'));
const AuditLogs = dynamic(() => import('./components/AuditLogs'));
const SystemConfig = dynamic(() => import('./components/SystemConfig'));
const CommandCenter = dynamic(() => import('./components/CommandCenter'));

interface AdminStats {
  totalUsers: number;
  totalInstitutions: number;
  totalApplications: number;
  totalRevenue: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  pendingApprovals: number;
  recentActivity: any[];
}

interface SystemMetrics {
  databaseConnections: number;
  apiResponseTime: number;
  storageUsage: number;
  errorRate: number;
  uptime: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const hasAccess = await checkAdminAccess();
      if (hasAccess) {
        await fetchDashboardData();
      } else {
        setLoading(false);
      }
    };

    init();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) {
        router.push('/login');
        return false;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        setError('Access denied. Admin privileges required.');
        router.push('/');
        return false;
      }

      setCurrentUser({ ...user, role: profile.role });
      return true;
    } catch (err: any) {
      console.error('Admin access check failed:', err);
      setError('Failed to verify admin access');
      return false;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch system stats
      const [usersRes, institutionsRes, applicationsRes, revenueRes, healthRes] = await Promise.all([
        supabase.from('profiles').select('id, role, created_at', { count: 'exact' }),
        supabase.from('institutions').select('id, status', { count: 'exact' }),
        supabase.from('leads').select('id, status', { count: 'exact' }),
        supabase.rpc('get_total_revenue'),
        fetch('/api/admin/health').then(r => r.json()).catch(() => ({ status: 'unknown' }))
      ]);

      // Calculate stats
      const totalUsers = usersRes.count || 0;
      const totalInstitutions = institutionsRes.count || 0;
      const totalApplications = applicationsRes.count || 0;
      const totalRevenue = revenueRes.data || 0;

      // Get active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      // Get pending approvals
      const { count: pendingApprovals } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from('leads')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          profiles(full_name),
          institutions(institution_name)
        `)
        .order('updated_at', { ascending: false })
        .limit(10);

      setStats({
        totalUsers,
        totalInstitutions,
        totalApplications,
        totalRevenue,
        activeUsers: activeUsers || 0,
        systemHealth: healthRes.status === 'healthy' ? 'healthy' : healthRes.status === 'warning' ? 'warning' : 'critical',
        pendingApprovals: pendingApprovals || 0,
        recentActivity: recentActivity || []
      });

      // Fetch system metrics
      const metricsRes = await fetch('/api/admin/metrics');
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'System Overview', icon: Monitor, color: 'from-blue-500 to-blue-600' },
    { id: 'users', label: 'User Management', icon: Users, color: 'from-green-500 to-green-600', component: UserManagement },
    { id: 'institutions', label: 'Institutions', icon: Building2, color: 'from-purple-500 to-purple-600', component: InstitutionManagement },
    { id: 'health', label: 'System Health', icon: Activity, color: 'from-orange-500 to-orange-600', component: SystemHealth },
    { id: 'audit', label: 'Audit Logs', icon: FileText, color: 'from-red-500 to-red-600', component: AuditLogs },
    { id: 'config', label: 'Configuration', icon: Settings, color: 'from-gray-500 to-gray-600', component: SystemConfig },
    { id: 'commands', label: 'Command Center', icon: Zap, color: 'from-yellow-500 to-yellow-600', component: CommandCenter },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">System Administrator</h1>
                <p className="text-sm text-gray-500">Command Center & Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser?.email}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <Lock className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-sm`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers.toLocaleString()}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">{stats?.activeUsers} active this month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Institutions</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalInstitutions.toLocaleString()}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-purple-500" />
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">All operational</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Applications</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalApplications.toLocaleString()}</p>
                  </div>
                  <FileText className="w-8 h-8 text-green-500" />
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <Clock className="w-4 h-4 text-orange-500 mr-1" />
                  <span className="text-orange-600">{stats?.pendingApprovals} pending</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">K{stats?.totalRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+12% this month</span>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  stats?.systemHealth === 'healthy' ? 'bg-green-100 text-green-800' :
                  stats?.systemHealth === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {stats?.systemHealth === 'healthy' ? <CheckCircle className="w-4 h-4" /> :
                   stats?.systemHealth === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                   <XCircle className="w-4 h-4" />}
                  <span className="capitalize">{stats?.systemHealth}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{metrics?.databaseConnections || 'N/A'}</div>
                  <div className="text-sm text-gray-600">DB Connections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{metrics?.apiResponseTime || 'N/A'}ms</div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{metrics?.uptime || 'N/A'}%</div>
                  <div className="text-sm text-gray-600">System Uptime</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <button
                  onClick={fetchDashboardData}
                  className="text-blue-600 hover:text-blue-700 p-2"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {stats?.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'approved' ? 'bg-green-500' :
                        activity.status === 'rejected' ? 'bg-red-500' :
                        activity.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.profiles?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.institutions?.institution_name || 'Unknown Institution'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 capitalize">{activity.status}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Render active component */}
        {activeTab !== 'overview' && (() => {
          const activeTabData = tabs.find(tab => tab.id === activeTab);
          const Component = activeTabData?.component;
          return Component ? <Component /> : null;
        })()}
      </div>
    </div>
  );
}