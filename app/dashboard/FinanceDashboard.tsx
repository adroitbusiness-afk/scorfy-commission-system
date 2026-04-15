'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { DollarSign, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface LeadWithBalance {
  id: string;
  name: string;
  email: string;
  total_commission: number;
  paid_commission: number;
  commission_balance: number;
}

interface PendingApproval {
  id: string;
  amount: number;
  created_at: string;
  leads: { name: string; email: string }[] | null;
}

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalOutstanding: 0, totalPaid: 0, totalCommission: 0 });
  const [leadsWithBalance, setLeadsWithBalance] = useState<LeadWithBalance[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get leads with outstanding balance
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, name, email, total_commission, paid_commission, commission_balance')
        .gt('commission_balance', 0);
      if (error) throw error;
      setLeadsWithBalance(leads || []);

      const totalOutstanding = (leads || []).reduce((sum, l) => sum + (l.commission_balance || 0), 0);
      const totalPaid = (leads || []).reduce((sum, l) => sum + (l.paid_commission || 0), 0);
      const totalCommission = (leads || []).reduce((sum, l) => sum + (l.total_commission || 0), 0);
      setStats({ totalOutstanding, totalPaid, totalCommission });

      // Fetch pending reconciliation approvals
      const { data: pending, error: pendingError } = await supabase
        .from('reconciliation_items')
        .select('id, amount, created_at, leads(name, email)')
        .eq('status', 'pending')
        .not('lead_id', 'is', null);
      if (!pendingError) setPendingApprovals(pending || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('reconciliation-updated', handleRefresh);
    return () => window.removeEventListener('reconciliation-updated', handleRefresh);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
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
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title="Total Commission Liability"
          value={`K${stats.totalCommission.toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="text-blue-400"
        />
        <Card
          title="Paid Commission"
          value={`K${stats.totalPaid.toFixed(2)}`}
          icon={<CheckCircle className="w-5 h-5" />}
          color="text-green-400"
        />
        <Card
          title="Outstanding Commission"
          value={`K${stats.totalOutstanding.toFixed(2)}`}
          icon={<AlertCircle className="w-5 h-5" />}
          color="text-yellow-400"
        />
      </div>

      {/* Leads with outstanding balance */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4">Outstanding Commission by Student</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Total Commission</th>
                <th className="text-left">Paid</th>
                <th className="text-left">Balance</th>
              </tr>
            </thead>
            <tbody>
              {leadsWithBalance.map(lead => (
                <tr key={lead.id} className="border-b border-gray-800">
                  <td className="py-2">{lead.name}</td>
                  <td>{lead.email}</td>
                  <td>K{lead.total_commission.toFixed(2)}</td>
                  <td>K{lead.paid_commission.toFixed(2)}</td>
                  <td className="text-yellow-400">K{lead.commission_balance.toFixed(2)}</td>
                </tr>
              ))}
              {leadsWithBalance.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">No outstanding balances</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Reconciliation Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Pending Approvals from Reconciliation</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">Student</th>
                  <th className="text-left">Amount</th>
                  <th className="text-left">Uploaded At</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map(item => (
                  <tr key={item.id} className="border-b border-gray-800">
                    <td className="py-2">{item.leads?.[0]?.name} ({item.leads?.[0]?.email})</td>
                    <td>K{item.amount}</td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => {
                          // Navigate to Reconciliation tab (you can use window.dispatchEvent to trigger tab change)
                          window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'reconciliation' }));
                        }}
                        className="px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
