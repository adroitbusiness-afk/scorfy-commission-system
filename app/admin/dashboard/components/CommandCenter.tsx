'use client';

import { useEffect, useState } from 'react';
import {
  Zap,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Mail,
  Users,
  Building2,
  FileText,
  DollarSign,
  Settings,
  Download,
  Upload,
  Trash2,
  Shield,
  Eye,
  EyeOff,
  Terminal,
  Code,
  Send,
  Pause,
  RotateCcw,
  Save,
  Loader2,
  Info,
  AlertCircle,
} from 'lucide-react';

interface Command {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'data' | 'user' | 'communication' | 'maintenance';
  dangerLevel: 'safe' | 'warning' | 'danger';
  requiresConfirmation: boolean;
  parameters?: CommandParameter[];
}

interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  description: string;
}

interface CommandExecution {
  id: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

export default function CommandCenter() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [executions, setExecutions] = useState<CommandExecution[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [commandParams, setCommandParams] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCommand, setConfirmationCommand] = useState<Command | null>(null);

  useEffect(() => {
    initializeCommands();
    loadExecutionHistory();
  }, []);

  const initializeCommands = () => {
    const availableCommands: Command[] = [
      // System Commands
      {
        id: 'system_restart',
        name: 'Restart System',
        description: 'Restart the application server',
        category: 'system',
        dangerLevel: 'warning',
        requiresConfirmation: true
      },
      {
        id: 'system_status',
        name: 'System Status',
        description: 'Check overall system health',
        category: 'system',
        dangerLevel: 'safe',
        requiresConfirmation: false
      },
      {
        id: 'clear_cache',
        name: 'Clear Cache',
        description: 'Clear all application caches',
        category: 'system',
        dangerLevel: 'safe',
        requiresConfirmation: false
      },

      // Data Commands
      {
        id: 'backup_database',
        name: 'Backup Database',
        description: 'Create a full database backup',
        category: 'data',
        dangerLevel: 'safe',
        requiresConfirmation: false
      },
      {
        id: 'export_data',
        name: 'Export Data',
        description: 'Export system data to CSV/JSON',
        category: 'data',
        dangerLevel: 'safe',
        requiresConfirmation: false,
        parameters: [
          {
            name: 'format',
            type: 'select',
            required: true,
            defaultValue: 'csv',
            options: ['csv', 'json', 'xml'],
            description: 'Export format'
          },
          {
            name: 'tables',
            type: 'string',
            required: false,
            defaultValue: 'all',
            description: 'Comma-separated table names (or "all")'
          }
        ]
      },
      {
        id: 'anonymize_data',
        name: 'Anonymize Data',
        description: 'Remove sensitive data for testing',
        category: 'data',
        dangerLevel: 'danger',
        requiresConfirmation: true
      },

      // User Commands
      {
        id: 'bulk_user_import',
        name: 'Bulk User Import',
        description: 'Import users from CSV file',
        category: 'user',
        dangerLevel: 'warning',
        requiresConfirmation: true,
        parameters: [
          {
            name: 'file_url',
            type: 'string',
            required: true,
            description: 'URL to CSV file with user data'
          },
          {
            name: 'send_welcome',
            type: 'boolean',
            required: false,
            defaultValue: true,
            description: 'Send welcome emails to imported users'
          }
        ]
      },
      {
        id: 'reset_user_passwords',
        name: 'Reset User Passwords',
        description: 'Reset passwords for users matching criteria',
        category: 'user',
        dangerLevel: 'danger',
        requiresConfirmation: true,
        parameters: [
          {
            name: 'criteria',
            type: 'string',
            required: true,
            description: 'SQL WHERE clause for user selection'
          },
          {
            name: 'new_password',
            type: 'string',
            required: true,
            description: 'New password for all matching users'
          }
        ]
      },

      // Communication Commands
      {
        id: 'send_bulk_email',
        name: 'Send Bulk Email',
        description: 'Send email to all users or filtered group',
        category: 'communication',
        dangerLevel: 'warning',
        requiresConfirmation: true,
        parameters: [
          {
            name: 'subject',
            type: 'string',
            required: true,
            description: 'Email subject line'
          },
          {
            name: 'message',
            type: 'string',
            required: true,
            description: 'Email message content (HTML supported)'
          },
          {
            name: 'filter',
            type: 'string',
            required: false,
            defaultValue: 'all',
            description: 'User filter criteria'
          }
        ]
      },
      {
        id: 'test_email_config',
        name: 'Test Email Configuration',
        description: 'Send a test email to verify SMTP settings',
        category: 'communication',
        dangerLevel: 'safe',
        requiresConfirmation: false,
        parameters: [
          {
            name: 'test_email',
            type: 'string',
            required: true,
            description: 'Email address to send test to'
          }
        ]
      },

      // Maintenance Commands
      {
        id: 'cleanup_old_data',
        name: 'Cleanup Old Data',
        description: 'Remove old logs, temp files, and expired data',
        category: 'maintenance',
        dangerLevel: 'warning',
        requiresConfirmation: true,
        parameters: [
          {
            name: 'days_old',
            type: 'number',
            required: false,
            defaultValue: 90,
            description: 'Remove data older than X days'
          }
        ]
      },
      {
        id: 'reindex_database',
        name: 'Reindex Database',
        description: 'Rebuild database indexes for performance',
        category: 'maintenance',
        dangerLevel: 'warning',
        requiresConfirmation: true
      },
      {
        id: 'generate_reports',
        name: 'Generate Reports',
        description: 'Generate comprehensive system reports',
        category: 'maintenance',
        dangerLevel: 'safe',
        requiresConfirmation: false,
        parameters: [
          {
            name: 'report_type',
            type: 'select',
            required: true,
            defaultValue: 'all',
            options: ['all', 'users', 'revenue', 'performance', 'errors'],
            description: 'Type of report to generate'
          },
          {
            name: 'date_range',
            type: 'string',
            required: false,
            defaultValue: '30d',
            description: 'Report date range (e.g., 7d, 30d, 90d)'
          }
        ]
      }
    ];

    setCommands(availableCommands);
  };

  const loadExecutionHistory = () => {
    // Mock execution history
    const mockExecutions: CommandExecution[] = [
      {
        id: 'exec-1',
        command: 'system_status',
        status: 'completed',
        startedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        completedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
        result: { status: 'healthy', uptime: '5d 2h', db_connections: 23 }
      },
      {
        id: 'exec-2',
        command: 'clear_cache',
        status: 'completed',
        startedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        completedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        result: { cache_cleared: true, items_removed: 1250 }
      },
      {
        id: 'exec-3',
        command: 'backup_database',
        status: 'failed',
        startedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        completedAt: new Date(Date.now() - 1000 * 60 * 29).toISOString(),
        error: 'Insufficient disk space for backup'
      }
    ];

    setExecutions(mockExecutions);
  };

  const executeCommand = async (command: Command) => {
    if (command.requiresConfirmation) {
      setConfirmationCommand(command);
      setShowConfirmation(true);
      return;
    }

    await runCommand(command);
  };

  const runCommand = async (command: Command) => {
    const executionId = `exec-${Date.now()}`;
    setExecuting(executionId);

    // Add to execution history
    const newExecution: CommandExecution = {
      id: executionId,
      command: command.id,
      status: 'running',
      startedAt: new Date().toISOString()
    };

    setExecutions(prev => [newExecution, ...prev]);

    try {
      // Simulate command execution
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock results based on command
      let result: any = {};
      const status: 'completed' = 'completed';

      switch (command.id) {
        case 'system_status':
          result = {
            status: 'healthy',
            uptime: '5d 2h 15m',
            db_connections: 23,
            memory_usage: '68%',
            cpu_usage: '45%'
          };
          break;
        case 'clear_cache':
          result = {
            cache_cleared: true,
            items_removed: 1250,
            memory_freed: '256MB'
          };
          break;
        case 'backup_database':
          result = {
            backup_created: true,
            file_size: '2.3GB',
            duration: '45s',
            location: '/backups/db_backup_2024.sql'
          };
          break;
        case 'system_restart':
          result = {
            restart_initiated: true,
            estimated_downtime: '30s',
            reason: 'Manual restart requested'
          };
          break;
        default:
          result = { message: 'Command executed successfully' };
      }

      // Update execution
      setExecutions(prev =>
        prev.map(exec =>
          exec.id === executionId
            ? {
                ...exec,
                status,
                completedAt: new Date().toISOString(),
                result,
                error: undefined
              }
            : exec
        )
      );

    } catch (error) {
      setExecutions(prev =>
        prev.map(exec =>
          exec.id === executionId
            ? {
                ...exec,
                status: 'failed',
                completedAt: new Date().toISOString(),
                error: 'Command execution failed'
              }
            : exec
        )
      );
    } finally {
      setExecuting(null);
      setSelectedCommand(null);
      setCommandParams({});
    }
  };

  const confirmExecuteCommand = async () => {
    if (confirmationCommand) {
      setShowConfirmation(false);
      await runCommand(confirmationCommand);
      setConfirmationCommand(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      system: Settings,
      data: Database,
      user: Users,
      communication: Mail,
      maintenance: Shield,
    };

    const Icon = iconMap[category] || Zap;
    return <Icon className="w-4 h-4" />;
  };

  const getDangerColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'danger': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderParameterInput = (param: CommandParameter) => {
    const value = commandParams[param.name] !== undefined ? commandParams[param.name] : param.defaultValue;

    switch (param.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => setCommandParams(prev => ({ ...prev, [param.name]: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">{param.description}</span>
          </div>
        );

      case 'select':
        return (
          <div>
            <select
              value={value || ''}
              onChange={(e) => setCommandParams(prev => ({ ...prev, [param.name]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select {param.name}</option>
              {param.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{param.description}</p>
          </div>
        );

      case 'number':
        return (
          <div>
            <input
              type="number"
              value={value || ''}
              onChange={(e) => setCommandParams(prev => ({ ...prev, [param.name]: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{param.description}</p>
          </div>
        );

      default:
        return (
          <div>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => setCommandParams(prev => ({ ...prev, [param.name]: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">{param.description}</p>
          </div>
        );
    }
  };

  const categories = ['system', 'data', 'user', 'communication', 'maintenance'];
  const filteredCommands = commands.filter(cmd => !selectedCommand || cmd.category === selectedCommand.category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Command Center</h2>
          <p className="text-gray-600">Execute system commands and administrative operations</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <AlertTriangle className="w-4 h-4" />
          <span>Use with caution - some commands cannot be undone</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Command Categories */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Command Categories</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCommand(commands.find(cmd => cmd.category === category) || null)}
                  className={`w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 ${
                    selectedCommand?.category === category ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  {getCategoryIcon(category)}
                  <span className="text-sm font-medium capitalize">{category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Commands List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-gray-900">Available Commands</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredCommands.map(command => (
                <div key={command.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">{command.name}</h4>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getDangerColor(command.dangerLevel)}`}>
                          {command.dangerLevel}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{command.description}</p>

                      {command.parameters && command.parameters.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-gray-700">Parameters:</p>
                          {command.parameters.map(param => (
                            <div key={param.name} className="ml-4">
                              {renderParameterInput(param)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => executeCommand(command)}
                      disabled={executing !== null}
                      className={`ml-4 px-3 py-1 text-sm font-medium rounded-lg ${
                        command.dangerLevel === 'danger'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : command.dangerLevel === 'warning'
                          ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:opacity-50`}
                    >
                      {executing === command.id ? (
                        <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                      ) : (
                        <Play className="w-4 h-4 inline mr-1" />
                      )}
                      Execute
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Execution History</h3>
          <button
            onClick={loadExecutionHistory}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            <RefreshCw className="w-4 h-4 inline mr-1" />
            Refresh
          </button>
        </div>
        <div className="divide-y divide-gray-200">
          {executions.map(execution => (
            <div key={execution.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(execution.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {commands.find(cmd => cmd.id === execution.command)?.name || execution.command}
                    </p>
                    <p className="text-xs text-gray-500">
                      Started: {new Date(execution.startedAt).toLocaleString()}
                      {execution.completedAt && ` • Completed: ${new Date(execution.completedAt).toLocaleString()}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                    execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                    execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {execution.status}
                  </span>
                </div>
              </div>

              {execution.result && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Result:</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(execution.result, null, 2)}
                  </pre>
                </div>
              )}

              {execution.error && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <p className="text-xs font-medium text-red-700 mb-2">Error:</p>
                  <p className="text-xs text-red-600">{execution.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && confirmationCommand && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <h3 className="text-lg font-bold text-gray-900">Confirm Execution</h3>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to execute this command?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium text-gray-900">{confirmationCommand.name}</p>
                  <p className="text-sm text-gray-600">{confirmationCommand.description}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getDangerColor(confirmationCommand.dangerLevel)}`}>
                      {confirmationCommand.dangerLevel} operation
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmExecuteCommand}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Execute Command
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
