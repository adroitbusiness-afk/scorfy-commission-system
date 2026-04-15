'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Clock, User, Mail, Phone, RefreshCw, MessageSquare, FileText } from 'lucide-react';

export default function ActivityLogDashboard() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    setLoading(true);
    const { data, error } = await supabase
      .from('communication_logs')
      .select('*, leads(name, assigned_recruiter(recruiters(name)))')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setActivities(data || []);
    setLoading(false);
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'note': return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'status_change': return <RefreshCw className="w-4 h-4 text-green-400" />;
      case 'call': return <Phone className="w-4 h-4 text-purple-400" />;
      case 'email': return <Mail className="w-4 h-4 text-yellow-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) return <div>Loading activities...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recruiter Activity Log</h2>
      <div className="space-y-4">
        {activities.map(act => (
          <div key={act.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {getIcon(act.type)}
                <span className="font-medium">{act.leads?.assigned_recruiter?.recruiters?.name || 'Unknown'}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(act.created_at).toLocaleString()}</span>
            </div>
            <p className="text-gray-300 text-sm mb-1">Lead: <strong>{act.leads?.name}</strong></p>
            <p className="text-gray-400 text-sm">{act.message}</p>
          </div>
        ))}
        {activities.length === 0 && <p className="text-center text-gray-500">No activities yet</p>}
      </div>
    </div>
  );
}