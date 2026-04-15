'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { DollarSign, Award, Users, TrendingUp, Clock, CheckCircle, AlertCircle, Phone, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  recruiterId: string;
}

export default function MyPerformanceDashboard({ recruiterId }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPoints: 0,
    totalCommissionEarned: 0,
    outstandingCommission: 0,
    leadCounts: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0 },
    recentActivities: [] as any[],
  });
  const [commissionTimeline, setCommissionTimeline] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [recruiterId]);

  async function loadData() {
    setLoading(true);
    try {
      // Reward points
      const { data: pointsData } = await supabase
        .from('reward_points')
        .select('points')
        .eq('recruiter_id', recruiterId);
      const totalPoints = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0;

      // Leads assigned to this recruiter
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_recruiter', recruiterId);
      if (error) throw error;

      const totalCommissionEarned = (leads || []).reduce((sum, l) => sum + (l.paid_commission || 0), 0);
      const outstandingCommission = (leads || []).reduce((sum, l) => sum + (l.commission_balance || 0), 0);

      const leadCounts = {
        new: (leads || []).filter(l => l.status === 'new').length,
        contacted: (leads || []).filter(l => l.status === 'contacted').length,
        qualified: (leads || []).filter(l => l.status === 'qualified').length,
        converted: (leads || []).filter(l => l.status === 'converted').length,
        lost: (leads || []).filter(l => l.status === 'lost').length,
      };

      // Recent activities from communication_logs for these leads
      const leadIds = (leads || []).map(l => l.id);
      let recentActivities: any[] = [];
      if (leadIds.length) {
        const { data: logs } = await supabase
          .from('communication_logs')
          .select('*, leads(name)')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false })
          .limit(10);
        recentActivities = logs || [];
      }

      // Commission timeline (last 6 months)
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(d.toISOString().slice(0, 7));
      }
      const { data: payments } = await supabase
        .from('commission_payments')
        .select('payment_date, amount')
        .in('lead_id', leadIds)
        .gte('payment_date', months[0] + '-01');
      const timeline = months.map(month => {
        const monthPayments = (payments || []).filter(p => p.payment_date.startsWith(month));
        const total = monthPayments.reduce((s, p) => s + p.amount, 0);
        return { month, amount: total };
      });
      setCommissionTimeline(timeline);

      setStats({ totalPoints, totalCommissionEarned, outstandingCommission, leadCounts, recentActivities });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12">Loading your dashboard...</div>;
  }

  const Card = ({ title, value, icon, color }: any) => (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-400 text-sm">{title}</p>
        {icon && <div className={color}>{icon}</div>}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Reward Points" value={stats.totalPoints} icon={<Award className="w-5 h-5" />} color="text-yellow-400" />
        <Card title="Commission Earned" value={`K${stats.totalCommissionEarned.toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} color="text-green-400" />
        <Card title="Outstanding Commission" value={`K${stats.outstandingCommission.toFixed(2)}`} icon={<AlertCircle className="w-5 h-5" />} color="text-orange-400" />
        <Card title="Total Leads" value={Object.values(stats.leadCounts).reduce((a, b) => a + b, 0)} icon={<Users className="w-5 h-5" />} color="text-blue-400" />
      </div>

      {/* Lead Funnel */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4">Your Lead Pipeline</h3>
        <div className="flex justify-around items-center py-4">
          <div className="text-center"><div className="text-2xl font-bold text-blue-400">{stats.leadCounts.new}</div><div className="text-xs text-gray-400">New</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-yellow-400">{stats.leadCounts.contacted}</div><div className="text-xs text-gray-400">Contacted</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-purple-400">{stats.leadCounts.qualified}</div><div className="text-xs text-gray-400">Qualified</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-green-400">{stats.leadCounts.converted}</div><div className="text-xs text-gray-400">Converted</div></div>
        </div>
      </div>

      {/* Commission Timeline */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4">Commission Over Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={commissionTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
            <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activities */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-gray-400" /> Recent Activity</h3>
        <div className="space-y-3">
          {stats.recentActivities.map((act) => (
            <div key={act.id} className="flex items-start gap-3 text-sm border-b border-gray-700 pb-2">
              <div className="mt-1">
                {act.type === 'note' && <MessageSquare className="w-4 h-4 text-blue-400" />}
                {act.type === 'status_change' && <RefreshCw className="w-4 h-4 text-green-400" />}
                {act.type === 'call' && <Phone className="w-4 h-4 text-purple-400" />}
                {act.type === 'email' && <Mail className="w-4 h-4 text-yellow-400" />}
              </div>
              <div className="flex-1">
                <p className="text-gray-300">{act.message}</p>
                <p className="text-xs text-gray-500">{new Date(act.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {stats.recentActivities.length === 0 && <p className="text-gray-500 text-center">No recent activity</p>}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 justify-end">
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-add-lead'))} className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          Add Lead
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-ai-import'))} className="px-4 py-2 bg-purple-600 rounded-lg flex items-center gap-2 hover:bg-purple-700">
          AI Import
        </button>
      </div>
    </div>
  );
}