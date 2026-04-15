import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  DollarSign,
  AlertTriangle,
  GraduationCap,
  TrendingUp,
  Brain,
  Sparkles,
  Award,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<any>(null);
  const [revenueByIntake, setRevenueByIntake] = useState<any[]>([]);
  const [studentsPerIntake, setStudentsPerIntake] = useState<any[]>([]);
  const [topRecruiters, setTopRecruiters] = useState<any[]>([]);
  const [revenueTimeline, setRevenueTimeline] = useState<any[]>([]);
  const [leadFunnel, setLeadFunnel] = useState<any>(null);
  const [commissionBreakdown, setCommissionBreakdown] = useState({
    first_claims_due: 0,
    second_claims_due: 0,
    third_claims_due: 0,
    overdue_claims: 0,
  });
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [missingCommissionCount, setMissingCommissionCount] = useState(0);
  const [inactiveRecruitersCount, setInactiveRecruitersCount] = useState(0);
  const [overdueClaimsTotal, setOverdueClaimsTotal] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // 1. Summary KPI
      const { data: summary } = await supabase.from('dashboard_summary').select('*').single();
      setKpi(summary);

      // 2. Revenue by intake
      const { data: intakeRev } = await supabase.from('revenue_by_intake').select('*');
      setRevenueByIntake(intakeRev || []);

      // 3. Students per intake
      const { data: intakeStudents } = await supabase.from('students_per_intake').select('*');
      setStudentsPerIntake(intakeStudents || []);

      // 4. Top 5 recruiters by revenue
      const { data: recruiters } = await supabase
        .from('revenue_by_recruiter')
        .select('*')
        .order('total_paid', { ascending: false })
        .limit(5);
      setTopRecruiters(recruiters || []);

      // 5. Revenue timeline (paid commissions over time)
      const { data: timeline } = await supabase
        .from('commission_summary')
        .select('paid_date, paid')
        .not('paid_date', 'is', null);
      const grouped = timeline?.reduce((acc: any, curr: any) => {
        const month = curr.paid_date.slice(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + curr.paid;
        return acc;
      }, {});
      const timelineArray = Object.entries(grouped || {}).map(([month, amount]) => ({ month, amount }));
      setRevenueTimeline(timelineArray.sort((a, b) => a.month.localeCompare(b.month)));

      // 6. Commission breakdown
      const { data: commissions } = await supabase.from('commission_summary').select('type, unpaid, overdue');
      let first = 0, second = 0, third = 0, overdue = 0;
      commissions?.forEach(c => {
        if (c.type === 'first_claim') first += c.unpaid;
        if (c.type === 'second_claim') second += c.unpaid;
        if (c.type === 'third_claim') third += c.unpaid;
        if (c.overdue > 0) overdue += c.overdue;
      });
      setCommissionBreakdown({ first_claims_due: first, second_claims_due: second, third_claims_due: third, overdue_claims: overdue });
      setOverdueClaimsTotal(overdue);

      // 7. Lead funnel
      const { data: funnel } = await supabase.from('leads_funnel').select('*').single();
      setLeadFunnel(funnel);

      // 8. Alerts (from various sources)
      const alertsList: any[] = [];

      const { data: overdueClaims } = await supabase.from('overdue_claims').select('student_name, amount');
      if (overdueClaims?.length) {
        const total = overdueClaims.reduce((s, c) => s + c.amount, 0);
        alertsList.push({ type: 'overdue', message: `${overdueClaims.length} overdue claim(s) totalling K${total.toFixed(2)}` });
      }

      const { count: missing } = await supabase.from('missing_commission_data').select('*', { count: 'exact', head: true });
      if (missing && missing > 0) {
        alertsList.push({ type: 'missing_data', message: `${missing} student(s) have no commission records.` });
        setMissingCommissionCount(missing);
      }

      const { count: duplicates } = await supabase.from('duplicate_leads').select('*', { count: 'exact', head: true });
      if (duplicates && duplicates > 0) {
        alertsList.push({ type: 'duplicate', message: `${duplicates} duplicate lead(s) detected.` });
        setDuplicateCount(duplicates);
      }

      const { count: inactive } = await supabase.from('inactive_recruiters').select('*', { count: 'exact', head: true });
      if (inactive && inactive > 0) {
        alertsList.push({ type: 'inactive_recruiter', message: `${inactive} recruiter(s) have no leads assigned.` });
        setInactiveRecruitersCount(inactive);
      }

      // 9. Unresolved alerts from the alerts table
      const { data: unresolved } = await supabase.from('unresolved_alerts').select('*');
      if (unresolved && unresolved.length) {
        unresolved.forEach(u => {
          alertsList.push({
            type: u.type,
            message: u.message,
            id: u.id,
            lead_id: u.lead_id,
            details: u,
          });
        });
      }

      setAlerts(alertsList);

      // 10. Cash flow projection
      const { data: cash } = await supabase.from('cash_flow_projection').select('*');
      setCashFlow(cash || []);

      // 11. AI Insights
      const insightsList: string[] = [];
      if (revenueByIntake.length) {
        const bestIntake = revenueByIntake.reduce((a, b) => (a.total_paid > b.total_paid ? a : b), revenueByIntake[0]);
        insightsList.push(`📈 ${bestIntake.intake} intake generates the most revenue: K${bestIntake.total_paid.toFixed(2)}.`);
      }
      if (topRecruiters.length) {
        const top = topRecruiters[0];
        insightsList.push(`🏆 Top recruiter: ${top.recruiter_name} with K${top.total_paid.toFixed(2)} in commission.`);
      }
      if (leadFunnel) {
        const convRate = leadFunnel.total_leads ? (leadFunnel.enrolled / leadFunnel.total_leads) * 100 : 0;
        insightsList.push(`🎯 Lead-to-enrollment rate: ${convRate.toFixed(1)}%. ${convRate < 10 ? 'Focus on lead qualification.' : 'Solid performance.'}`);
      }
      if (overdueClaimsTotal > 0) {
        insightsList.push(`⚠️ K${overdueClaimsTotal.toFixed(2)} in overdue claims – follow up with finance.`);
      }
      if (missingCommissionCount > 0) {
        insightsList.push(`📄 ${missingCommissionCount} students missing commission records – review data.`);
      }
      if (inactiveRecruitersCount > 0) {
        insightsList.push(`👥 ${inactiveRecruitersCount} recruiters are inactive – reassign leads or retrain.`);
      }
      if (insightsList.length === 0) insightsList.push('✅ All systems healthy. Revenue stable.');
      setInsights(insightsList);

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  }

  const resolveAlert = async (alertId: string) => {
    await supabase.rpc('resolve_alert', { alert_id: alertId });
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-800/50 rounded-2xl p-6 animate-pulse h-32" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-2xl p-6 animate-pulse h-80" />
          <div className="bg-gray-800/50 rounded-2xl p-6 animate-pulse h-80" />
        </div>
      </div>
    );
  }

  const Card = ({ title, value, icon, trend }: { title: string; value: string | number; icon?: React.ReactNode; trend?: string }) => (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-400 text-sm">{title}</p>
        {icon && <div className="text-blue-400">{icon}</div>}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {trend && <p className="text-xs text-green-400 mt-2">{trend}</p>}
    </div>
  );

  const conversionRate = leadFunnel ? ((leadFunnel.enrolled / leadFunnel.total_leads) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      {/* TOP KPI ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total Revenue" value={`K${kpi?.total_commission?.toFixed(2) || 0}`} icon={<DollarSign className="w-5 h-5" />} trend="+12% vs last month" />
        <Card title="Outstanding Claims" value={`K${kpi?.outstanding?.toFixed(2) || 0}`} icon={<AlertTriangle className="w-5 h-5 text-yellow-500" />} trend={overdueClaimsTotal > 0 ? `${overdueClaimsTotal} overdue` : 'Up to date'} />
        <Card title="Total Students" value={kpi?.total_students || 0} icon={<GraduationCap className="w-5 h-5" />} />
        <Card title="Conversion Rate" value={`${conversionRate}%`} icon={<TrendingUp className="w-5 h-5" />} />
      </div>

      {/* SECOND ROW – Revenue Over Time & Intake Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Revenue Over Time (Monthly)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
              <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Students per Intake</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={studentsPerIntake}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="intake" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
              <Bar dataKey="students" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* THIRD ROW – Lead Funnel & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Lead Pipeline</h3>
          {leadFunnel && (
            <>
              <div className="flex justify-around items-center py-4">
                <div className="text-center"><div className="text-2xl font-bold text-blue-400">{leadFunnel.total_leads}</div><div className="text-xs text-gray-400">Leads</div></div>
                <div className="text-center"><div className="text-2xl font-bold text-yellow-400">{leadFunnel.contacted}</div><div className="text-xs text-gray-400">Contacted</div></div>
                <div className="text-center"><div className="text-2xl font-bold text-green-400">{leadFunnel.qualified}</div><div className="text-xs text-gray-400">Qualified</div></div>
                <div className="text-center"><div className="text-2xl font-bold text-purple-400">{leadFunnel.enrolled}</div><div className="text-xs text-gray-400">Enrolled</div></div>
              </div>
              <div className="mt-2 text-center text-sm">
                <span className="text-gray-400">Lead → Enrolled: </span>
                <span className="text-white font-bold">{((leadFunnel.enrolled / leadFunnel.total_leads) * 100).toFixed(1)}%</span>
              </div>
            </>
          )}
        </div>
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" /> AI Insights</h3>
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <Sparkles className="w-4 h-4 text-purple-400 mt-0.5" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FOURTH ROW – Recruiter Leaderboard */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-yellow-500" /> Recruiter Leaderboard</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2">Recruiter</th>
                <th className="text-left">Students</th>
                <th className="text-left">Revenue (K)</th>
                <th className="text-left">Commission (K)</th>
                </tr>
            </thead>
            <tbody>
              {topRecruiters.map((rec) => (
                <tr key={rec.recruiter_id} className="border-b border-gray-800">
                  <td className="py-2">{rec.recruiter_name}</td>
                  <td>{rec.students_recruited || 0}</td>
                  <td>{rec.total_paid?.toFixed(2) || 0}</td>
                  <td>{(rec.total_paid * 0.1).toFixed(2)}</td>
                </tr>
              ))}
              {topRecruiters.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">No recruiter data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FIFTH ROW – Claims Tracker */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4">Claims Tracker</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><p className="text-gray-400 text-sm">First Claims Due</p><p className="text-xl font-bold text-blue-400">K{commissionBreakdown.first_claims_due.toFixed(2)}</p></div>
          <div><p className="text-gray-400 text-sm">Second Claims Due</p><p className="text-xl font-bold text-yellow-400">K{commissionBreakdown.second_claims_due.toFixed(2)}</p></div>
          <div><p className="text-gray-400 text-sm">Third Claims Due</p><p className="text-xl font-bold text-orange-400">K{commissionBreakdown.third_claims_due.toFixed(2)}</p></div>
          <div><p className="text-gray-400 text-sm">Overdue Claims</p><p className="text-xl font-bold text-red-400">K{commissionBreakdown.overdue_claims.toFixed(2)}</p></div>
        </div>
        {cashFlow.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-medium mb-2">Cash Flow Projection</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short' })} stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }} />
                <Line type="monotone" dataKey="expected_income" stroke="#3B82F6" name="Expected" />
                <Line type="monotone" dataKey="outstanding" stroke="#F59E0B" name="Outstanding" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* SIXTH ROW – Alerts Panel */}
      {alerts.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" /> Alerts & Risks</h3>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id || Math.random()} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300">{alert.message}</p>
                </div>
                {alert.id && (
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    Mark Done
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}