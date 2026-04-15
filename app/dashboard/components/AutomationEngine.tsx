'use client';

import { useState } from 'react';
import { Zap, CheckCircle, Clock, AlertCircle, Play, Settings } from 'lucide-react';

interface AutomationState {
  name: string;
  description: string;
  icon: JSX.Element;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export default function AutomationEngine({ institutionId }: { institutionId: string }) {
  const [automations, setAutomations] = useState<Record<string, AutomationState>>({
    'follow-up-pending': {
      name: 'Pending Application Follow-up',
      description: 'Automatically sends follow-up message to leads with pending applications after 3 days',
      icon: <Clock size={20} />,
      enabled: true,
      status: 'idle',
    },
    'payment-reminder': {
      name: 'Payment Reminder',
      description: 'Sends payment reminder to approved students who haven\'t paid within 5 days',
      icon: <AlertCircle size={20} />,
      enabled: true,
      status: 'idle',
    },
    'commission-trigger': {
      name: 'Commission Auto-Creation',
      description: 'Automatically creates commission claims when verified payments are received',
      icon: <Zap size={20} />,
      enabled: true,
      status: 'idle',
    },
  });

  const [running, setRunning] = useState(false);

  const triggerAutomation = async (automationKey: string) => {
    setRunning(true);
    setAutomations(prev => ({
      ...prev,
      [automationKey]: { ...prev[automationKey], status: 'running' },
    }));

    try {
      const res = await fetch('/api/automations/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation: automationKey }),
      });

      const result = await res.json();

      if (result.success) {
        setAutomations(prev => ({
          ...prev,
          [automationKey]: {
            ...prev[automationKey],
            status: 'completed',
            lastRun: new Date().toISOString(),
          },
        }));

        alert(`✅ ${automations[automationKey].name}\n${result.processed} items processed`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Automation error:', error);
      setAutomations(prev => ({
        ...prev,
        [automationKey]: { ...prev[automationKey], status: 'error' },
      }));
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to run automation'}`);
    } finally {
      setRunning(false);
    }
  };

  const toggleAutomation = (automationKey: string) => {
    setAutomations(prev => ({
      ...prev,
      [automationKey]: {
        ...prev[automationKey],
        enabled: !prev[automationKey].enabled,
      },
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />;
      case 'completed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'error':
        return <AlertCircle className="text-red-600" size={20} />;
      default:
        return <Zap className="text-gray-400" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Smart Automations</h3>
            <p className="text-sm text-blue-800">
              These automations run automatically on a schedule and can also be triggered manually below. All automations are reversible and logged.
            </p>
          </div>
        </div>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(automations).map(([key, automation]) => (
          <div
            key={key}
            className={`border rounded-lg p-6 transition-all ${getStatusColor(automation.status)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="mt-1 text-gray-600">{getStatusIcon(automation.status)}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{automation.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{automation.description}</p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleAutomation(key)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  automation.enabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {automation.enabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Last Run Info */}
            {automation.lastRun && (
              <div className="text-xs text-gray-600 mb-3">
                Last run: {new Date(automation.lastRun).toLocaleString()}
              </div>
            )}

            {/* Run Now Button */}
            <div className="flex gap-2">
              <button
                onClick={() => triggerAutomation(key)}
                disabled={running || !automation.enabled}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all ${
                  automation.enabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                <Play size={16} />
                {automation.status === 'running' ? 'Running...' : 'Run Now'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={20} className="text-gray-700" />
          <h3 className="font-semibold text-gray-900">Automation Schedule</h3>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Pending Follow-up</p>
              <p className="text-sm text-gray-600">Runs every 6 hours</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Next run: 2 hours</p>
              <button className="text-blue-600 text-sm hover:underline mt-1">Adjust Schedule</button>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Payment Reminder</p>
              <p className="text-sm text-gray-600">Runs every 24 hours</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Next run: 8 hours</p>
              <button className="text-blue-600 text-sm hover:underline mt-1">Adjust Schedule</button>
            </div>
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Commission Trigger</p>
              <p className="text-sm text-gray-600">Runs instantly on payment approval</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Real-time</p>
              <button className="text-blue-600 text-sm hover:underline mt-1">View Settings</button>
            </div>
          </div>
        </div>
      </div>

      {/* Automation Logs */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
            <span className="text-gray-700">✅ Payment reminder sent to 5 students</span>
            <span className="text-gray-500 text-xs">1 hour ago</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
            <span className="text-gray-700">✅ Follow-up sent to 3 pending applications</span>
            <span className="text-gray-500 text-xs">4 hours ago</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
            <span className="text-gray-700">✅ 2 commission claims auto-created</span>
            <span className="text-gray-500 text-xs">12 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}