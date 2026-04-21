'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import {
  Shield, Users, Building2, FileText, DollarSign, Activity,
  AlertTriangle, CheckCircle, Clock, TrendingUp, Database,
  Settings, Zap, RefreshCw, Lock, Loader2, Flag, Key,
  Megaphone, Mail, BarChart3, Crown, Bell, Archive, Save
} from 'lucide-react';

// Lazy load all components (existing + new)
const Overview = dynamic(() => import('./components/Overview'));
const UserManagement = dynamic(() => import('./components/UserManagement'));
const InstitutionManagement = dynamic(() => import('./components/InstitutionManagement'));
const AuditLogs = dynamic(() => import('./components/AuditLogs'));
const FeatureFlags = dynamic(() => import('./components/FeatureFlags'));
const ScheduledJobs = dynamic(() => import('./components/ScheduledJobs'));
const MaintenanceMode = dynamic(() => import('./components/MaintenanceMode'));
const Impersonation = dynamic(() => import('./components/Impersonation'));
const BulkMessaging = dynamic(() => import('./components/BulkMessaging'));
const RetentionPolicies = dynamic(() => import('./components/RetentionPolicies'));
const BackupRestore = dynamic(() => import('./components/BackupRestore'));
const ApiKeys = dynamic(() => import('./components/ApiKeys'));
const Announcements = dynamic(() => import('./components/Announcements'));
const EmailTemplates = dynamic(() => import('./components/EmailTemplates'));
const Analytics = dynamic(() => import('./components/Analytics'));
const RoleManager = dynamic(() => import('./components/RoleManager'));
const SystemHealth = dynamic(() => import('./components/SystemHealth'));
const CommandCenter = dynamic(() => import('./components/CommandCenter'));
const SystemConfig = dynamic(() => import('./components/SystemConfig'));

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      const hasAccess = await checkAdminAccess();
      if (hasAccess) setLoading(false);
    };
    init();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) { router.push('/login'); return false; }
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
      setError('Failed to verify admin access');
      return false;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity, component: Overview },
    { id: 'users', label: 'User Management', icon: Users, component: UserManagement },
    { id: 'institutions', label: 'Institutions', icon: Building2, component: InstitutionManagement },
    { id: 'audit', label: 'Audit Logs', icon: FileText, component: AuditLogs },
    { id: 'flags', label: 'Feature Flags', icon: Flag, component: FeatureFlags },
    { id: 'jobs', label: 'Scheduled Jobs', icon: Clock, component: ScheduledJobs },
    { id: 'maintenance', label: 'Maintenance Mode', icon: Lock, component: MaintenanceMode },
    { id: 'impersonate', label: 'Impersonation', icon: Users, component: Impersonation },
    { id: 'bulk', label: 'Bulk Messaging', icon: Bell, component: BulkMessaging },
    { id: 'retention', label: 'Data Retention', icon: Archive, component: RetentionPolicies },
    { id: 'backup', label: 'Backup & Restore', icon: Database, component: BackupRestore },
    { id: 'apikeys', label: 'API Keys', icon: Key, component: ApiKeys },
    { id: 'announce', label: 'Announcements', icon: Megaphone, component: Announcements },
    { id: 'email', label: 'Email Templates', icon: Mail, component: EmailTemplates },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, component: Analytics },
    { id: 'roles', label: 'Role Manager', icon: Crown, component: RoleManager },
    { id: 'health', label: 'System Health', icon: Activity, component: SystemHealth },
    { id: 'config', label: 'Configuration', icon: Settings, component: SystemConfig },
    { id: 'commands', label: 'Command Center', icon: Zap, component: CommandCenter },
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
          <button onClick={() => router.push('/')} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Return to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">System Administrator</h1>
                <p className="text-sm text-gray-500">Enterprise Command Center</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser?.email}</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="text-gray-500 hover:text-gray-700 p-2">
                <Lock className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scrollable tabs */}
        <div className="mb-8 overflow-x-auto">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dynamic component rendering */}
        {(() => {
          const activeTabData = tabs.find(tab => tab.id === activeTab);
          const Component = activeTabData?.component;
          return Component ? <Component /> : <div>Component not found</div>;
        })()}
      </div>
    </div>
  );
}