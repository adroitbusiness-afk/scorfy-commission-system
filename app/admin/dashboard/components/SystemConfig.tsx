'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Key,
  Mail,
  Database,
  Shield,
  Globe,
  Zap,
  DollarSign,
  Clock,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Server,
  HardDrive,
  Wifi,
  Bell,
  FileText,
  Users,
  Building2,
} from 'lucide-react';

interface SystemSetting {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'select' | 'password';
  category: string;
  label: string;
  description: string;
  options?: string[];
  requiresRestart?: boolean;
  sensitive?: boolean;
}

export default function SystemConfig() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [activeCategory, setActiveCategory] = useState('general');
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setLoading(true);

      // Mock system settings
      const mockSettings: SystemSetting[] = [
        // General Settings
        {
          key: 'app_name',
          value: 'Scorfy Commission System',
          type: 'string',
          category: 'general',
          label: 'Application Name',
          description: 'The name displayed throughout the application'
        },
        {
          key: 'app_url',
          value: 'https://scorify.com',
          type: 'string',
          category: 'general',
          label: 'Application URL',
          description: 'The base URL of the application',
          requiresRestart: true
        },
        {
          key: 'timezone',
          value: 'UTC',
          type: 'select',
          category: 'general',
          label: 'System Timezone',
          description: 'Default timezone for the application',
          options: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Africa/Harare']
        },
        {
          key: 'maintenance_mode',
          value: false,
          type: 'boolean',
          category: 'general',
          label: 'Maintenance Mode',
          description: 'Enable maintenance mode to prevent user access',
          requiresRestart: false
        },

        // Database Settings
        {
          key: 'db_host',
          value: 'localhost',
          type: 'string',
          category: 'database',
          label: 'Database Host',
          description: 'PostgreSQL database host',
          requiresRestart: true
        },
        {
          key: 'db_port',
          value: 5432,
          type: 'number',
          category: 'database',
          label: 'Database Port',
          description: 'PostgreSQL database port',
          requiresRestart: true
        },
        {
          key: 'db_name',
          value: 'scorify_db',
          type: 'string',
          category: 'database',
          label: 'Database Name',
          description: 'PostgreSQL database name',
          requiresRestart: true
        },
        {
          key: 'db_max_connections',
          value: 100,
          type: 'number',
          category: 'database',
          label: 'Max Connections',
          description: 'Maximum database connections',
          requiresRestart: true
        },

        // Email Settings
        {
          key: 'smtp_host',
          value: 'smtp.gmail.com',
          type: 'string',
          category: 'email',
          label: 'SMTP Host',
          description: 'SMTP server hostname',
          requiresRestart: false
        },
        {
          key: 'smtp_port',
          value: 587,
          type: 'number',
          category: 'email',
          label: 'SMTP Port',
          description: 'SMTP server port',
          requiresRestart: false
        },
        {
          key: 'smtp_username',
          value: 'noreply@scorify.com',
          type: 'string',
          category: 'email',
          label: 'SMTP Username',
          description: 'SMTP authentication username',
          requiresRestart: false
        },
        {
          key: 'smtp_password',
          value: '••••••••',
          type: 'password',
          category: 'email',
          label: 'SMTP Password',
          description: 'SMTP authentication password',
          sensitive: true,
          requiresRestart: false
        },
        {
          key: 'email_from',
          value: 'noreply@scorify.com',
          type: 'string',
          category: 'email',
          label: 'From Email',
          description: 'Default sender email address',
          requiresRestart: false
        },

        // Security Settings
        {
          key: 'session_timeout',
          value: 3600,
          type: 'number',
          category: 'security',
          label: 'Session Timeout',
          description: 'User session timeout in seconds',
          requiresRestart: false
        },
        {
          key: 'password_min_length',
          value: 8,
          type: 'number',
          category: 'security',
          label: 'Minimum Password Length',
          description: 'Minimum characters required for passwords',
          requiresRestart: false
        },
        {
          key: 'two_factor_required',
          value: false,
          type: 'boolean',
          category: 'security',
          label: 'Require 2FA',
          description: 'Require two-factor authentication for all users',
          requiresRestart: false
        },
        {
          key: 'api_rate_limit',
          value: 1000,
          type: 'number',
          category: 'security',
          label: 'API Rate Limit',
          description: 'Maximum API requests per hour per user',
          requiresRestart: false
        },

        // Payment Settings
        {
          key: 'commission_rate',
          value: 500,
          type: 'number',
          category: 'payments',
          label: 'Commission Rate (ZMW)',
          description: 'Commission paid per successful enrollment',
          requiresRestart: false
        },
        {
          key: 'payment_gateway',
          value: 'stripe',
          type: 'select',
          category: 'payments',
          label: 'Payment Gateway',
          description: 'Primary payment processing gateway',
          options: ['stripe', 'paypal', 'bank_transfer'],
          requiresRestart: true
        },
        {
          key: 'currency',
          value: 'ZMW',
          type: 'select',
          category: 'payments',
          label: 'Currency',
          description: 'Default currency for transactions',
          options: ['ZMW', 'USD', 'EUR', 'GBP'],
          requiresRestart: false
        },
        {
          key: 'auto_process_payments',
          value: true,
          type: 'boolean',
          category: 'payments',
          label: 'Auto Process Payments',
          description: 'Automatically process commission payments',
          requiresRestart: false
        },

        // Notification Settings
        {
          key: 'email_notifications',
          value: true,
          type: 'boolean',
          category: 'notifications',
          label: 'Email Notifications',
          description: 'Enable email notifications system-wide',
          requiresRestart: false
        },
        {
          key: 'sms_notifications',
          value: false,
          type: 'boolean',
          category: 'notifications',
          label: 'SMS Notifications',
          description: 'Enable SMS notifications (requires Twilio)',
          requiresRestart: false
        },
        {
          key: 'notification_batch_size',
          value: 50,
          type: 'number',
          category: 'notifications',
          label: 'Batch Size',
          description: 'Number of notifications to send per batch',
          requiresRestart: false
        }
      ];

      setSettings(mockSettings);
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setChanges(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // In a real implementation, this would call an API
      console.log('Saving settings:', changes);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update local settings
      setSettings(prev =>
        prev.map(setting =>
          changes[setting.key] !== undefined
            ? { ...setting, value: changes[setting.key] }
            : setting
        )
      );

      setChanges({});
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setChanges({});
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      general: Settings,
      database: Database,
      email: Mail,
      security: Shield,
      payments: DollarSign,
      notifications: Bell,
    };

    const Icon = iconMap[category] || Settings;
    return <Icon className="w-4 h-4" />;
  };

  const getCategoryLabel = (category: string) => {
    const labelMap: Record<string, string> = {
      general: 'General',
      database: 'Database',
      email: 'Email',
      security: 'Security',
      payments: 'Payments',
      notifications: 'Notifications',
    };

    return labelMap[category] || category;
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const currentValue = changes[setting.key] !== undefined ? changes[setting.key] : setting.value;
    const isChanged = changes[setting.key] !== undefined;

    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => updateSetting(setting.key, !currentValue)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                currentValue ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  currentValue ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">
              {currentValue ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );

      case 'select':
        return (
          <select
            value={currentValue}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isChanged ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            {setting.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'password':
        const isVisible = showSensitive[setting.key];
        return (
          <div className="flex items-center space-x-2">
            <input
              type={isVisible ? 'text' : 'password'}
              value={currentValue}
              onChange={(e) => updateSetting(setting.key, e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isChanged ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            />
            <button
              onClick={() => setShowSensitive(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => updateSetting(setting.key, parseInt(e.target.value) || 0)}
            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isChanged ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isChanged ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          />
        );
    }
  };

  const categories = ['general', 'database', 'email', 'security', 'payments', 'notifications'];
  const filteredSettings = settings.filter(setting => setting.category === activeCategory);
  const hasChanges = Object.keys(changes).length > 0;
  const requiresRestart = Object.keys(changes).some(key =>
    settings.find(s => s.key === key)?.requiresRestart
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
          <p className="text-gray-600">Manage system settings and configuration</p>
        </div>
        <div className="flex space-x-3">
          {hasChanges && (
            <button
              onClick={resetChanges}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Change Warning */}
      {hasChanges && (
        <div className={`p-4 rounded-lg border ${
          requiresRestart
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center">
            {requiresRestart ? (
              <AlertTriangle className="w-5 h-5 mr-2" />
            ) : (
              <Info className="w-5 h-5 mr-2" />
            )}
            <div>
              <p className="font-medium">
                {requiresRestart ? 'Restart Required' : 'Settings Changed'}
              </p>
              <p className="text-sm">
                {requiresRestart
                  ? 'Some changes require a system restart to take effect.'
                  : 'Changes will take effect immediately.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Categories</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 ${
                    activeCategory === category ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  {getCategoryIcon(category)}
                  <span className="text-sm font-medium capitalize">
                    {getCategoryLabel(category)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center space-x-3">
                {getCategoryIcon(activeCategory)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getCategoryLabel(activeCategory)} Settings
                  </h3>
                  <p className="text-sm text-gray-600">
                    Configure {getCategoryLabel(activeCategory).toLowerCase()} system settings
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading settings...</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredSettings.map(setting => (
                  <div key={setting.key} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {setting.label}
                          </h4>
                          {setting.requiresRestart && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              Restart Required
                            </span>
                          )}
                          {setting.sensitive && (
                            <Lock className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {setting.description}
                        </p>
                      </div>
                      <div className="ml-6 flex-shrink-0">
                        {renderSettingInput(setting)}
                      </div>
                    </div>
                    {changes[setting.key] !== undefined && (
                      <div className="mt-2 text-xs text-blue-600">
                        Changed from: {typeof setting.value === 'boolean' ? (setting.value ? 'Enabled' : 'Disabled') : setting.value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}