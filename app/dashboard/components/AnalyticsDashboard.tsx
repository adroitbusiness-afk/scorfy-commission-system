'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { TrendingUp, Users, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface FunnelMetrics {
  totalLeads: number;
  totalApplications: number;
  approvedApplications: number;
  totalPaid: number;
  conversionRate: number;
  approvalRate: number;
  paymentRate: number;
}

interface RevenueMetrics {
  totalRevenue: number;
  expectedRevenue: number;
  outstandingBalance: number;
  averagePerStudent: string;
}

interface AnalyticsData {
  funnel: FunnelMetrics;
  revenue: RevenueMetrics;
  byProgram: Record<string, any>;
  recruiterPerformance: any[];
  trends: any;
}

export default function AnalyticsDashboard({ institutionId }: { institutionId: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics/institution/${institutionId}`);
      const data = await res.json();

      if (data.success) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { funnel, revenue, byProgram, recruiterPerformance, trends } = analytics;

  // Prepare funnel data for visualization
  const funnelData = [
    { stage: 'Leads', value: funnel.totalLeads, percentage: 100 },
    { stage: 'Applications', value: funnel.totalApplications, percentage: Math.round((funnel.totalApplications / funnel.totalLeads) * 100) },
    { stage: 'Approved', value: funnel.approvedApplications, percentage: Math.round((funnel.approvedApplications / funnel.totalLeads) * 100) },
    { stage: 'Paid', value: funnel.totalPaid, percentage: Math.round((funnel.totalPaid / funnel.totalLeads) * 100) },
  ];

  // Prepare revenue breakdown
  const revenueChartData = [
    { name: 'Collected', value: revenue.totalRevenue },
    { name: 'Outstanding', value: revenue.outstandingBalance },
  ];

  const colors = ['#10B981', '#EF4444'];

  // Program performance
  const programData = Object.entries(byProgram).map(([name, stats]: [string, any]) => ({
    program: name,
    total: stats.total,
    approved: stats.approved,
    paid: stats.paid,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-blue-600">{funnel.conversionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Leads → Applications</p>
            </div>
            <TrendingUp size={40} className="text-blue-200" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Approval Rate</p>
              <p className="text-3xl font-bold text-green-600">{funnel.approvalRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Applications Approved</p>
            </div>
            <CheckCircle size={40} className="text-green-200" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Rate</p>
              <p className="text-3xl font-bold text-purple-600">{funnel.paymentRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Approved → Paid</p>
            </div>
            <DollarSign size={40} className="text-purple-200" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-orange-600">K{(revenue.totalRevenue / 1000).toFixed(1)}K</p>
              <p className="text-xs text-gray-500 mt-1">Verified Payments</p>
            </div>
            <DollarSign size={40} className="text-orange-200" />
          </div>
        </div>
      </div>

      {/* Financial Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Collected vs Outstanding</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name}: K${(value / 1000).toFixed(0)}K`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {colors.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => `K${(value / 1000).toFixed(0)}K`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Expected Revenue:</span>
              <span className="font-semibold">K{(revenue.expectedRevenue / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average per Student:</span>
              <span className="font-semibold">K{revenue.averagePerStudent}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
          <div className="space-y-3">
            {funnelData.map((item, index) => (
              <div key={item.stage}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.stage}</span>
                  <span className="text-xs text-gray-500">{item.value} ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600">Collected Revenue</p>
              <p className="text-2xl font-bold text-green-600">K{(revenue.totalRevenue / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-gray-600">Outstanding Balance</p>
              <p className="text-2xl font-bold text-orange-600">K{(revenue.outstandingBalance / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600">Collection Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {revenue.expectedRevenue > 0
                  ? ((revenue.totalRevenue / revenue.expectedRevenue) * 100).toFixed(1)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Program Performance */}
      {programData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Performance by Program</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="program" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" name="Total Applications" />
                <Bar dataKey="approved" fill="#82ca9d" name="Approved" />
                <Bar dataKey="paid" fill="#ffc658" name="Paid" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recruiter Performance */}
      {recruiterPerformance.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Top Recruiters</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700">Recruiter</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Claims</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Total Commission</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Paid</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-700">Pending</th>
                </tr>
              </thead>
              <tbody>
                {recruiterPerformance.slice(0, 5).map(recruiter => (
                  <tr key={recruiter.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{recruiter.name}</td>
                    <td className="px-4 py-3 text-right">{recruiter.claimCount}</td>
                    <td className="px-4 py-3 text-right font-semibold">K{recruiter.totalCommissions}</td>
                    <td className="px-4 py-3 text-right text-green-600">K{recruiter.paidCommissions}</td>
                    <td className="px-4 py-3 text-right text-orange-600">K{recruiter.pendingCommissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 30-Day Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">30-Day Trends</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600">New Leads</p>
            <p className="text-2xl font-bold text-blue-600">{trends.leadsLast30Days}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600">Applications</p>
            <p className="text-2xl font-bold text-green-600">{trends.appsLast30Days}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-600">Revenue</p>
            <p className="text-2xl font-bold text-purple-600">K{(trends.revenueL30Days / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>
    </div>
  );
}