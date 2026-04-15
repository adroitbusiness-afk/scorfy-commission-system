'use client';

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Users,
  Briefcase,
  DollarSign,
  Megaphone,
  FileText,
  UserCog,
  UserPlus,
  Link2,
  Handshake,
  PenTool,
  Map,
  MessageCircle,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  GraduationCap,
  Phone,
  Mail,
  User,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Download,
  Star,
  Calendar,
  Upload,
  File as FileIcon,
  Sparkles,
  Loader2,
  Brain,
  Check,
  AlertCircle,
  UserCheck,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Award,
  Send,
  Copy,
  Share2,
  MessageSquare,
  Gift,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
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

// Lazy load dashboards (corrected dynamic import)
const ClientDashboard = dynamic(() => import('./ClientDashboard'));
const ProjectsDashboard = dynamic(() => import('./ProjectsDashboard'));
const FinanceDashboard = dynamic(() => import('./FinanceDashboard'));
const MarketingDashboard = dynamic(() => import('./MarketingDashboard'));
const ProposalDashboard = dynamic(() => import('./ProposalDashboard'));
const StaffDashboard = dynamic(() => import('./StaffDashboard'));
const RecruitmentDashboard = dynamic(() => import('./RecruitmentDashboard'), { ssr: false });
const ReferralDashboard = dynamic(() => import('./ReferralDashboard'));
const AffiliateDashboard = dynamic(() => import('./AffiliateDashboard'));
const AdGeneratorDashboard = dynamic(() => import('./AdGeneratorDashboard'));
const NetworkMapDashboard = dynamic(() => import('./NetworkMapDashboard'));

// ============================================================================
// Type Definitions
// ============================================================================
interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  id_number?: string;
  program?: string;
  mode_of_study?: string;
  intake?: string;
  school?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: string;
  source?: string;
  notes?: string;
  assigned_recruiter?: string | null;
  next_followup?: string;
  lead_score?: number;
  commission?: number;
  paid_commission?: number;
  tags?: string[];
  gender?: string;
  country?: string;
  date_of_birth?: string;
  student_number?: string;
  admission_date?: string;
}

interface Recruiter {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  active_leads: number;
  max_leads: number;
  department: string;
  role?: string;
  referral_code?: string;
  reward_points?: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface ExtractedLead {
  id?: string;
  name: string;
  email: string;
  phone: string;
  id_number?: string;
  program?: string;
  mode_of_study?: string;
  confidence: number;
  source?: string;
  recruiter_id?: string | null;
  gender?: string;
  country?: string;
  date_of_birth?: string;
  student_number?: string;
  admission_date?: string;
  intake?: string;
  school?: string;
  paid_commission?: number;
}

// ============================================================================
// Chat Component (fixed broadcast channel)
// ============================================================================
function ChatPanel({ currentUserId, currentUserName }: { currentUserId: string; currentUserName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<Recruiter[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { users: onlineUsers, othersTyping, setTyping } = useRoomPresence('dashboard-chat', currentUserId);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch recruiters list for chat
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('recruiters').select('id, name, email, active_leads, max_leads, department');
      setUsersList((data as Recruiter[]) || []);
    };
    fetchUsers();
  }, []);

  function useRoomPresence(roomId: string, profileId: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [users, setUsers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!roomId || !profileId) return;

    const channel = supabase.channel(roomId, { config: { private: true } });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<
          string,
          Array<{ online_at?: string; typing?: boolean }>
        >;
        const next: Record<string, any> = {};
        for (const [key, presences] of Object.entries(state)) {
          const p = presences[0];
          next[key] = {
            profileId: key,
            typing: Boolean(p?.typing),
            online_at: String(p?.online_at ?? ''),
          };
        }
        setUsers(next);
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        await channel.track(
          { online_at: new Date().toISOString(), typing: false },
          { key: profileId }
        );
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, profileId]);

  const setTyping = (isTyping: boolean) => {
    const channel = channelRef.current;
    if (!channel) return;
    channel.track(
      { online_at: new Date().toISOString(), typing: isTyping },
      { key: profileId }
    );
  };

  return {
    users: Object.values(users),
    othersTyping: Object.values(users).some((u) => u.profileId !== profileId && u.typing),
    setTyping,
  };
}
  // Create stable broadcast channel
  useEffect(() => {
    const channel = supabase.channel('dashboard-messages');
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'new-message' }, (payload) => {
        const msg = payload.payload;
        if (
          (msg.sender_id === currentUserId && msg.receiver_id === selectedUser) ||
          (msg.sender_id === selectedUser && msg.receiver_id === currentUserId)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedUser]);

  // Fetch messages with selected user
  useEffect(() => {
    if (!selectedUser) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .or(`sender_id.eq.${selectedUser},receiver_id.eq.${selectedUser}`)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      // Mark as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', selectedUser);
    };
    fetchMessages();
  }, [selectedUser, currentUserId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;

    const messagePayload = {
      sender_id: currentUserId,
      receiver_id: selectedUser,
      message: newMessage,
      read: false,
      created_at: new Date().toISOString(),
    };

    // Insert to database
    const { data, error } = await supabase
      .from('messages')
      .insert(messagePayload)
      .select()
      .single();
    if (error) {
      console.error('Error sending message:', error);
      return;
    }

    // Broadcast for real-time delivery using the stable channel
    channelRef.current?.send({
      type: 'broadcast',
      event: 'new-message',
      payload: data,
    });

    setMessages((prev) => [...prev, data]);
    setNewMessage('');
    setTyping(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getOnlineStatus = (userId: string) => {
    const online = onlineUsers.find((u) => u.profileId === userId);
    return online ? '● Online' : '○ Offline';
  };

  const getTypingStatus = () => {
    if (othersTyping) return 'typing...';
    return '';
  };

  return (
    <div className="fixed right-0 top-20 bottom-0 w-96 bg-gray-900 border-l border-gray-800 shadow-2xl z-40 flex flex-col">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h3 className="font-semibold">Messages</h3>
        <button onClick={() => window.dispatchEvent(new CustomEvent('close-chat'))} className="p-1 hover:bg-gray-800 rounded">
          <X size={18} />
        </button>
      </div>
      <div className="flex h-full">
        {/* User list */}
        <div className="w-1/3 border-r border-gray-800 overflow-y-auto">
          {usersList.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user.id)}
              className={`w-full text-left p-3 hover:bg-gray-800 transition ${selectedUser === user.id ? 'bg-gray-800' : ''}`}
            >
              <div className="font-medium truncate">{user.name}</div>
              <div className="text-xs text-gray-400">{getOnlineStatus(user.id)}</div>
            </button>
          ))}
        </div>
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="p-3 border-b border-gray-800 bg-gray-800/50">
                <div className="font-medium">
                  {usersList.find((u) => u.id === selectedUser)?.name}
                </div>
                <div className="text-xs text-gray-400">{getTypingStatus()}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.sender_id === currentUserId
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-200'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {othersTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-400">
                      typing...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t border-gray-800 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    setTyping(e.target.value.length > 0);
                  }}
                  onBlur={() => setTyping(false)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a user to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Executive Dashboard (fixed with maybeSingle fallbacks)
// ============================================================================
function ExecutiveDashboard() {
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
  const [serviceFeePercent, setServiceFeePercent] = useState(5);
  const [monthlySalary, setMonthlySalary] = useState(2000);
  const [currentMonthFee, setCurrentMonthFee] = useState(0);
  const [currentMonthSalary, setCurrentMonthSalary] = useState(0);

  useEffect(() => {
    loadDashboardData();
    loadSettings();
    loadCurrentMonthFees();
  }, []);

  async function loadSettings() {
    const { data: settings } = await supabase.from('settings').select('key, value');
    if (settings) {
      const fee = settings.find(s => s.key === 'service_fee_percent')?.value;
      const sal = settings.find(s => s.key === 'monthly_salary')?.value;
      if (fee) setServiceFeePercent(parseFloat(fee));
      if (sal) setMonthlySalary(parseFloat(sal));
    }
  }

  async function loadCurrentMonthFees() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data: fees } = await supabase
      .from('fees_and_salaries')
      .select('service_fee, salary')
      .eq('month', firstDay)
      .maybeSingle();
    if (fees) {
      setCurrentMonthFee(fees.service_fee);
      setCurrentMonthSalary(fees.salary);
    }
  }

  async function loadDashboardData() {
    try {
      // 1. Summary KPI
      const { data: summary } = await supabase.from('dashboard_summary').select('*').maybeSingle();
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

      // 5. Revenue timeline
      const { data: timeline } = await supabase
        .from('commission_summary')
        .select('paid_date, paid')
        .not('paid_date', 'is', null);
      const grouped = timeline?.reduce((acc: any, curr: any) => {
        const month = curr.paid_date.slice(0, 7);
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
      const { data: funnel } = await supabase.from('leads_funnel').select('*').maybeSingle();
      setLeadFunnel(funnel);

      // 8. Alerts
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

      const { data: unresolved } = await supabase.from('unresolved_alerts').select('*');
      if (unresolved && unresolved.length) {
        unresolved.forEach(u => {
          alertsList.push({ type: u.type, message: u.message, id: u.id, lead_id: u.lead_id, details: u });
        });
      }

      setAlerts(alertsList);

      // 9. Cash flow projection
      const { data: cash } = await supabase.from('cash_flow_projection').select('*');
      setCashFlow(cash || []);

      // 10. AI Insights
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

      {/* SIXTH ROW – Service Fee & Salary */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold mb-4">Service Fee & Salary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Service Fee (this month)</p>
            <p className="text-2xl font-bold text-yellow-400">K{currentMonthFee.toFixed(2)}</p>
            <p className="text-xs text-gray-500">({serviceFeePercent}% of total commission)</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Monthly Salary (per recruiter)</p>
            <p className="text-2xl font-bold text-green-400">K{monthlySalary.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Fixed amount per active recruiter</p>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-gray-400">
          Fees are automatically deducted from commissions. Salaries are calculated monthly.
        </div>
      </div>

      {/* ALERTS PANEL */}
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

// ============================================================================
// LeadItem Component (memoized)
// ============================================================================
const LeadItem = memo(
  ({
    lead,
    recruiters,
    isSelected,
    onSelect,
    onUpdateStatus,
    onAssign,
    onScheduleFollowup,
    onAddNotes,
    onExportSingle,
  }: any) => {
    // Placeholder – replace with your actual LeadItem implementation
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex items-center gap-4">
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(lead.id)} />
        <div className="flex-1">
          <div className="font-medium">{lead.name}</div>
          <div className="text-sm text-gray-400">{lead.email}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onUpdateStatus(lead.id, 'contacted')} className="p-1 bg-blue-600 rounded">Contact</button>
          <button onClick={() => onAssign(lead)} className="p-1 bg-purple-600 rounded">Assign</button>
          <button onClick={() => onExportSingle(lead)} className="p-1 bg-green-600 rounded"><Download size={14} /></button>
        </div>
      </div>
    );
  }
);
LeadItem.displayName = 'LeadItem';

// ============================================================================
// Reconciliation Dashboard (placeholder)
// ============================================================================
function ReconciliationDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/reconcile', { method: 'POST', body: formData });
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h2 className="text-xl font-semibold mb-4">Reconcile with University Data</h2>
        <p className="text-gray-400 mb-4">Upload Excel, PDF, or DOCX file containing student payment records.</p>
        <div className="flex gap-4">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
          />
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Reconcile'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">Status</th>
                  <th className="text-left">Name</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Amount</th>
                  <th className="text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    <td className="py-2">
                      {r.status === 'matched' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {r.status === 'missing' && <XCircle className="w-5 h-5 text-red-400" />}
                      {r.status === 'missing_payment' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                    </td>
                    <td>{r.data.name || '-'}</td>
                    <td>{r.data.email || '-'}</td>
                    <td>K{r.data.amount}</td>
                    <td className="text-sm text-gray-400">{r.message}</td>
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

// ============================================================================
// Main Dashboard Component
// ============================================================================
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('executive');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedLeadForAction, setSelectedLeadForAction] = useState<Lead | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [currentRecruiter, setCurrentRecruiter] = useState<Recruiter | null>(null);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [showReferral, setShowReferral] = useState(false);
  const [serviceFee, setServiceFee] = useState(0);
  const [salary, setSalary] = useState(0);

  // Lead management state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [leadFilter, setLeadFilter] = useState<'all' | 'new' | 'contacted' | 'qualified' | 'unassigned'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecruiter, setSelectedRecruiter] = useState<string>('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // File upload and AI extraction state
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [selectedLeadsForImport, setSelectedLeadsForImport] = useState<Set<number>>(new Set());

  // Debounced search
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchQuery]);

  // Guard against multiple concurrent calls (React StrictMode)
  const fetchingUserRef = useRef(false);

  // Fetch current user and recruiter profile
  useEffect(() => {
    if (fetchingUserRef.current) return;
    fetchingUserRef.current = true;

    const fetchUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Auth error:', userError);
          return;
        }
        if (!user) return;

        // Try to get recruiter record (maybe doesn't exist yet)
        let { data: recruiter, error: recruiterError } = await supabase
          .from('recruiters')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(); // returns null if not found, no error

        if (recruiterError) {
          console.error('Recruiter fetch error:', recruiterError);
          return;
        }

        // If recruiter doesn't exist, create one
        if (!recruiter) {
          const newRecruiter = {
            user_id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'New Recruiter',
            email: user.email,
            department: 'Recruitment',
            role: 'Recruiter',
            active_leads: 0,
            max_leads: 50,
            status: 'active',
            referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          };
          const { data: inserted, error: createError } = await supabase
            .from('recruiters')
            .insert(newRecruiter)
            .select()
            .single();
          if (createError) {
            console.error('Failed to create recruiter:', createError);
            return;
          }
          recruiter = inserted;
        }

        // Fetch reward points separately (if table exists)
        let points = 0;
        try {
          const { data: rewardData, error: rewardError } = await supabase
            .from('reward_points')
            .select('points')
            .eq('recruiter_id', recruiter.id);
          if (!rewardError && rewardData) {
            points = rewardData.reduce((sum, r) => sum + r.points, 0);
          }
        } catch (err) {
          // ignore if table doesn't exist
          console.warn('Reward points table not available', err);
        }

        setCurrentRecruiter(recruiter);
        setRewardPoints(points);
      } catch (err) {
        console.error('Unexpected error in fetchUser:', err);
      } finally {
        fetchingUserRef.current = false;
      }
    };

    fetchUser();
  }, []);

  // Fetch service fee and salary settings
  useEffect(() => {
    const fetchFees = async () => {
      const { data: settings } = await supabase.from('settings').select('key, value');
      if (settings) {
        const fee = settings.find((s) => s.key === 'service_fee_percent')?.value || '5';
        const sal = settings.find((s) => s.key === 'monthly_salary')?.value || '2000';
        setServiceFee(parseFloat(fee));
        setSalary(parseFloat(sal));
      }
    };
    fetchFees();
  }, []);

  // Track referral clicks (when user shares link)
  const trackReferralClick = async () => {
    if (!currentRecruiter?.referral_code) return;
    await supabase.from('referral_clicks').insert({
      recruiter_id: currentRecruiter.id,
      ip_address: 'client-side',
    });
    // Add reward points
    const pointsPerClick = 10;
    await supabase.from('reward_points').insert({
      recruiter_id: currentRecruiter.id,
      points: pointsPerClick,
      source: 'referral_click',
    });
    setRewardPoints((prev) => prev + pointsPerClick);
    showNotification('+10 reward points!', 'success');
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/admission/${currentRecruiter?.referral_code}`;
    navigator.clipboard.writeText(link);
    showNotification('Referral link copied!', 'success');
    trackReferralClick();
  };

  // Tab configuration – includes Reconciliation
  const tabs = [
    { id: 'executive', label: 'Executive', icon: LayoutDashboard, color: 'from-indigo-500 to-purple-600', component: ExecutiveDashboard },
    { id: 'leads', label: 'Leads', icon: GraduationCap, color: 'from-blue-500 to-blue-600', component: LeadsDashboard, badge: leads.filter((l) => l.status === 'new').length },
    { id: 'recruitment', label: 'Recruitment', icon: UserPlus, color: 'from-purple-500 to-purple-600', component: RecruitmentDashboard },
    { id: 'clients', label: 'Clients', icon: Users, color: 'from-green-500 to-green-600', component: ClientDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase, color: 'from-emerald-500 to-emerald-600', component: ProjectsDashboard },
    { id: 'finance', label: 'Finance', icon: DollarSign, color: 'from-pink-500 to-pink-600', component: FinanceDashboard },
    { id: 'marketing', label: 'Marketing', icon: Megaphone, color: 'from-orange-500 to-orange-600', component: MarketingDashboard },
    { id: 'proposals', label: 'Proposals', icon: FileText, color: 'from-indigo-500 to-indigo-600', component: ProposalDashboard },
    { id: 'staff', label: 'Staff', icon: UserCog, color: 'from-teal-500 to-teal-600', component: StaffDashboard },
    { id: 'referrals', label: 'Referrals', icon: Link2, color: 'from-cyan-500 to-cyan-600', component: ReferralDashboard },
    { id: 'affiliates', label: 'Affiliates', icon: Handshake, color: 'from-rose-500 to-rose-600', component: AffiliateDashboard },
    { id: 'ads', label: 'Ad Generator', icon: PenTool, color: 'from-amber-500 to-amber-600', component: AdGeneratorDashboard },
    { id: 'network', label: 'Network Map', icon: Map, color: 'from-violet-500 to-violet-600', component: NetworkMapDashboard },
    { id: 'reconciliation', label: 'Reconciliation', icon: FileText, color: 'from-indigo-500 to-purple-600', component: ReconciliationDashboard },
    { id: 'chat', label: 'Chat', icon: MessageCircle, color: 'from-fuchsia-500 to-fuchsia-600', component: () => <div>Chat placeholder</div> },
  ];

  // Real-time subscription for leads
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch leads from Supabase
  async function fetchLeads() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, recruiter:assigned_recruiter(name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      showNotification('Failed to load leads', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRecruiters() {
    try {
      const { data, error } = await supabase.from('recruiters').select('*').order('name');
      if (error && error.code === '42P01') {
        await createDefaultRecruiters();
        return;
      }
      if (error) throw error;
      setRecruiters(data || []);
    } catch (error) {
      console.error('Error fetching recruiters:', error);
      setRecruiters([]);
    }
  }

  async function createDefaultRecruiters() {
    const defaultRecruiters = [
      { name: 'John Smith', email: 'john.smith@dmbds.com', department: 'Tech Recruitment', role: 'Senior Recruiter', active_leads: 0, max_leads: 50, status: 'active' },
      { name: 'Sarah Johnson', email: 'sarah.j@dmbds.com', department: 'Student Recruitment', role: 'Lead Recruiter', active_leads: 0, max_leads: 40, status: 'active' },
      { name: 'Michael Brown', email: 'michael.b@dmbds.com', department: 'International Students', role: 'Recruiter', active_leads: 0, max_leads: 45, status: 'active' },
      { name: 'Emily Davis', email: 'emily.d@dmbds.com', department: 'Executive Search', role: 'Senior Recruiter', active_leads: 0, max_leads: 35, status: 'active' },
      { name: 'David Wilson', email: 'david.w@dmbds.com', department: 'IT Recruitment', role: 'Recruiter', active_leads: 0, max_leads: 50, status: 'active' },
    ];
    const { data, error } = await supabase.from('recruiters').insert(defaultRecruiters).select();
    if (error) console.error('Error creating default recruiters:', error);
    else setRecruiters(data || []);
  }

  async function addLead(leadData?: { name: string; email: string; phone: string; notes?: string }) {
    const dataToInsert = leadData || { name, email, phone, notes };
    if (!dataToInsert.name || !dataToInsert.email || !dataToInsert.phone) {
      showNotification('Please fill in all fields', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.from('leads').insert([{ ...dataToInsert, status: 'new', lead_score: 0, tags: [] }]);
      if (error) throw error;
      if (!leadData) {
        setName('');
        setEmail('');
        setPhone('');
        setNotes('');
        setIsAddLeadModalOpen(false);
      }
      showNotification('Lead added successfully', 'success');
      fetchLeads();
    } catch (error) {
      console.error('Error adding lead:', error);
      showNotification('Failed to add lead', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function addMultipleLeads(leadsToAdd: ExtractedLead[]) {
    setIsLoading(true);
    try {
      const leadsForInsertion = leadsToAdd.map((lead) => ({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || '',
        id_number: lead.id_number || '',
        program: lead.program || 'Not specified',
        mode_of_study: lead.mode_of_study || 'Not specified',
        status: 'new',
        source: lead.source || 'AI Import',
        lead_score: Math.round((lead.confidence || 0.7) * 100),
        notes: `Imported via AI on ${new Date().toLocaleDateString()}\nConfidence: ${Math.round((lead.confidence || 0.7) * 100)}%\nProgram: ${lead.program || 'Not specified'}\nMode: ${lead.mode_of_study || 'Not specified'}`,
        tags: ['ai-imported', lead.mode_of_study?.toLowerCase().replace('-', '_') || 'unknown'],
        assigned_recruiter: lead.recruiter_id || null,
        gender: lead.gender || null,
        country: lead.country || null,
        date_of_birth: lead.date_of_birth || null,
        student_number: lead.student_number || null,
        admission_date: lead.admission_date || null,
        intake: lead.intake || null,
        school: lead.school || null,
        paid_commission: lead.paid_commission || 0,
        commission: 1000,
      }));
      const batchSize = 100;
      for (let i = 0; i < leadsForInsertion.length; i += batchSize) {
        const batch = leadsForInsertion.slice(i, i + batchSize);
        const { error } = await supabase.from('leads').insert(batch);
        if (error) throw error;
      }
      setExtractedLeads([]);
      setSelectedLeadsForImport(new Set());
      setIsUploadModalOpen(false);
      setFile(null);
      showNotification(`Successfully imported ${leadsForInsertion.length} leads!`, 'success');
      fetchLeads();
    } catch (error: any) {
      console.error('Error adding multiple leads:', error);
      showNotification(`Failed to import leads: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateLeadStatus(leadId: string, newStatus: Lead['status']) {
    try {
      const { error: statusError } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (statusError) throw statusError;

      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;

      if (newStatus === 'contacted') {
        const followupDate = new Date();
        followupDate.setDate(followupDate.getDate() + 2);
        await supabase.from('followups').insert({
          lead_id: leadId,
          type: 'call',
          scheduled_date: followupDate.toISOString().split('T')[0],
          message: 'Follow‑up call to discuss program details',
          status: 'pending',
        });
        await supabase.from('communication_logs').insert({
          lead_id: leadId,
          type: 'note',
          message: `Status changed to contacted. Follow‑up call scheduled for ${followupDate.toLocaleDateString()}`,
        });
      } else if (newStatus === 'qualified') {
        const followupDate = new Date();
        followupDate.setDate(followupDate.getDate() + 5);
        await supabase.from('followups').insert({
          lead_id: leadId,
          type: 'email',
          scheduled_date: followupDate.toISOString().split('T')[0],
          message: 'Send enrollment information',
          status: 'pending',
        });
        await supabase.from('communication_logs').insert({
          lead_id: leadId,
          type: 'note',
          message: `Status changed to qualified. Email follow‑up scheduled for ${followupDate.toLocaleDateString()}`,
        });
      }

      if (newStatus === 'converted') {
        await supabase.from('leads').update({ commission: 1000 }).eq('id', leadId);
        await supabase.from('communication_logs').insert({
          lead_id: leadId,
          type: 'note',
          message: 'Lead converted. Commission of K1000 assigned.',
        });
      }

      showNotification(`Lead status updated to ${newStatus}`, 'success');
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
      showNotification('Failed to update lead status', 'error');
    }
  }

  async function assignLeadToRecruiter(leadId: string, recruiterId: string) {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_recruiter: recruiterId, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
      try {
        await supabase.rpc('increment_recruiter_leads', { recruiter_id: recruiterId });
      } catch {
        /* ignore */
      }
      showNotification('Lead assigned successfully', 'success');
      fetchLeads();
      setIsAssignModalOpen(false);
      setSelectedLeadForAction(null);
    } catch (error) {
      console.error('Error assigning lead:', error);
      showNotification('Failed to assign lead', 'error');
    }
  }

  async function updateLeadNotes(leadId: string, notes: string) {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
      showNotification('Notes updated', 'success');
      fetchLeads();
    } catch (error) {
      console.error('Error updating notes:', error);
      showNotification('Failed to update notes', 'error');
    }
  }

  async function scheduleFollowup(leadId: string, followupDate: string) {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ next_followup: followupDate, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
      showNotification('Follow-up scheduled', 'success');
      fetchLeads();
    } catch (error) {
      console.error('Error scheduling followup:', error);
      showNotification('Failed to schedule follow-up', 'error');
    }
  }

  // Bulk actions
  async function bulkUpdateStatus(status: Lead['status']) {
    if (selectedLeadIds.size === 0) return;
    setIsLoading(true);
    try {
      const promises = Array.from(selectedLeadIds).map((id) =>
        supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      );
      await Promise.all(promises);
      showNotification(`Updated ${selectedLeadIds.size} leads to ${status}`, 'success');
      setSelectedLeadIds(new Set());
      fetchLeads();
    } catch (error) {
      showNotification('Failed to update leads', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function bulkAssign(recruiterId: string) {
    if (selectedLeadIds.size === 0) return;
    setIsLoading(true);
    try {
      const promises = Array.from(selectedLeadIds).map((id) =>
        supabase.from('leads').update({ assigned_recruiter: recruiterId, updated_at: new Date().toISOString() }).eq('id', id)
      );
      await Promise.all(promises);
      showNotification(`Assigned ${selectedLeadIds.size} leads`, 'success');
      setSelectedLeadIds(new Set());
      fetchLeads();
    } catch (error) {
      showNotification('Failed to assign leads', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function bulkDelete() {
    if (selectedLeadIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedLeadIds.size} leads? This action cannot be undone.`)) return;
    setIsLoading(true);
    try {
      const promises = Array.from(selectedLeadIds).map((id) => supabase.from('leads').delete().eq('id', id));
      await Promise.all(promises);
      showNotification(`Deleted ${selectedLeadIds.size} leads`, 'success');
      setSelectedLeadIds(new Set());
      fetchLeads();
    } catch (error) {
      showNotification('Failed to delete leads', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function exportLeads() {
    const leadsToExport = filteredLeads;
    if (leadsToExport.length === 0) {
      showNotification('No leads to export', 'error');
      return;
    }
    const csvRows = [
      ['Name', 'Email', 'Phone', 'Status', 'Created At', 'Assigned Recruiter', 'Notes', 'Lead Score'],
      ...leadsToExport.map((lead) => [
        lead.name,
        lead.email,
        lead.phone,
        lead.status,
        new Date(lead.created_at).toLocaleDateString(),
        recruiters.find((r) => r.id === lead.assigned_recruiter)?.name || '',
        lead.notes?.replace(/,/g, ';') || '',
        lead.lead_score || '',
      ]),
    ];
    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Exported ${leadsToExport.length} leads`, 'success');
  }

  function exportSingleLead(lead: Lead) {
    const csvRows = [
      ['Name', 'Email', 'Phone', 'Status', 'Created At', 'Assigned Recruiter', 'Notes', 'Lead Score'],
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.status,
        new Date(lead.created_at).toLocaleDateString(),
        recruiters.find((r) => r.id === lead.assigned_recruiter)?.name || '',
        lead.notes?.replace(/,/g, ';') || '',
        lead.lead_score || '',
      ],
    ];
    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead_${lead.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Exported ${lead.name}`, 'success');
  }

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((lead) => lead.id)));
    }
  };

  const toggleSelectLead = (id: string) => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLeadIds(newSet);
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // AI Extraction function
  const extractLeadsFromFile = useCallback(async (file: File) => {
    setIsExtracting(true);
    setExtractionError(null);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/extract-leads', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to extract leads');
      const data = await response.json();
      setExtractedLeads(data.leads);
      setUploadProgress(100);
      setSelectedLeadsForImport(new Set(data.leads.map((_: any, index: number) => index)));
    } catch (error) {
      console.error('Error extracting leads:', error);
      setExtractionError('Failed to extract leads from file. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setIsExtracting(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedLeads([]);
      setExtractionError(null);
      extractLeadsFromFile(selectedFile);
    }
  };

  const toggleLeadSelection = (index: number) => {
    const newSelection = new Set(selectedLeadsForImport);
    if (newSelection.has(index)) newSelection.delete(index);
    else newSelection.add(index);
    setSelectedLeadsForImport(newSelection);
  };

  const selectAllLeads = () => {
    if (selectedLeadsForImport.size === extractedLeads.length) {
      setSelectedLeadsForImport(new Set());
    } else {
      setSelectedLeadsForImport(new Set(extractedLeads.map((_, index) => index)));
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchRecruiters();
  }, []);

  // Define filteredLeads BEFORE LeadsDashboard uses it
  const filteredLeads = useMemo(() => {
    let filtered = leads.filter((lead) => {
      if (leadFilter === 'all') return true;
      if (leadFilter === 'unassigned') return !lead.assigned_recruiter;
      return lead.status === leadFilter;
    });
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.name?.toLowerCase().includes(searchLower) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.phone?.includes(debouncedSearch)
      );
    }
    return filtered;
  }, [leads, leadFilter, debouncedSearch]);

  // Leads Dashboard Component (now defined after filteredLeads)
  function LeadsDashboard() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Leads Management</h2>
          <div className="flex gap-2">
            <button onClick={() => setIsAddLeadModalOpen(true)} className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2">
              <Plus size={18} /> Add Lead
            </button>
            <button onClick={() => setIsUploadModalOpen(true)} className="px-4 py-2 bg-purple-600 rounded-lg flex items-center gap-2">
              <Upload size={18} /> AI Import
            </button>
          </div>
        </div>
        <div className="flex gap-4 mb-4">
          <select value={leadFilter} onChange={(e) => setLeadFilter(e.target.value as any)} className="bg-gray-800 rounded-lg px-3 py-2">
            <option value="all">All Leads</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="unassigned">Unassigned</option>
          </select>
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-800 rounded-lg px-3 py-2 flex-1"
          />
          <div className="flex gap-2">
            <button onClick={() => bulkUpdateStatus('contacted')} className="px-3 py-2 bg-blue-600 rounded-lg">Contact</button>
            <button
              onClick={() => {
                const recruiterId = prompt('Enter recruiter ID:');
                if (recruiterId) bulkAssign(recruiterId);
              }}
              className="px-3 py-2 bg-purple-600 rounded-lg"
            >
              Assign
            </button>
            <button onClick={bulkDelete} className="px-3 py-2 bg-red-600 rounded-lg">Delete</button>
            <button onClick={exportLeads} className="px-3 py-2 bg-green-600 rounded-lg">Export</button>
          </div>
        </div>
        {isLoading ? (
          <div>Loading leads...</div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <LeadItem
                key={lead.id}
                lead={lead}
                recruiters={recruiters}
                isSelected={selectedLeadIds.has(lead.id)}
                onSelect={toggleSelectLead}
                onUpdateStatus={updateLeadStatus}
                onAssign={(lead: Lead) => {
                  setSelectedLeadForAction(lead);
                  setIsAssignModalOpen(true);
                }}
                onScheduleFollowup={(lead: Lead, date: string) => scheduleFollowup(lead.id, date)}
                onAddNotes={(lead: Lead, notes: string) => updateLeadNotes(lead.id, notes)}
                onExportSingle={exportSingleLead}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const ActiveComponent = activeTabConfig.component;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400 bg-green-500/20';
    if (confidence >= 0.7) return 'text-yellow-400 bg-yellow-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const NotificationToast = () => {
    if (!notification) return null;
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white text-sm`}
      >
        {notification.message}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-30 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl">
                <LayoutDashboard size={20} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  DMBDS-BMS
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">Business Management Suite</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Flashing Referral Button */}
            {currentRecruiter && (
              <motion.button
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                onClick={() => setShowReferral(!showReferral)}
                className="relative p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg hover:shadow-lg transition-all group"
                title="Share your referral link"
              >
                <Share2 size={18} className="text-white" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </motion.button>
            )}

            {/* Notification Bell */}
            <button className="relative p-1.5 sm:p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Bell size={18} className="sm:w-5 sm:h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">{currentRecruiter?.name || 'Admin'}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Gift size={12} className="text-yellow-500" /> {rewardPoints} points
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-sm sm:text-lg font-bold">
                  {currentRecruiter?.name?.charAt(0) || 'A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 sm:w-72 bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="hidden lg:flex items-center gap-3 p-6 border-b border-gray-800">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <LayoutDashboard size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                DMBDS-BMS
              </h1>
              <p className="text-xs text-gray-400">Business Management Suite</p>
            </div>
          </div>
          <div className="lg:hidden p-4 border-b border-gray-800">
            <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent border-none outline-none ml-2 text-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="space-y-0.5 sm:space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`relative w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 group ${
                      isActive ? `bg-gradient-to-r ${tab.color} shadow-lg` : 'hover:bg-gray-800/50'
                    }`}
                  >
                    <Icon size={16} className="sm:w-5 sm:h-5" />
                    <span className={`flex-1 text-left text-xs sm:text-sm font-medium truncate`}>{tab.label}</span>
                    {tab.badge ? (
                      <span className="px-1.5 py-0.5 text-[10px] sm:text-xs rounded-full bg-white/20">{tab.badge}</span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </nav>
          <div className="p-3 sm:p-4 border-t border-gray-800">
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:bg-blue-500/10 text-blue-400 transition-colors group mb-2"
            >
              <MessageSquare size={16} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium">Messages</span>
              {showChat && <ChevronRight size={14} className="ml-auto" />}
            </button>
            <button className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:bg-red-500/10 text-red-400 transition-colors group">
              <LogOut size={16} className="sm:w-5 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`pt-16 sm:pt-20 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64 sm:lg:ml-72' : ''
        }`}
      >
        <div className="p-3 sm:p-6">
          <div className="flex items-center gap-1 sm:gap-2 mb-4 sm:mb-6 text-xs sm:text-sm">
            <span className="text-gray-400">Dashboard</span>
            <ChevronRight size={12} className="sm:w-4 sm:h-4 text-gray-600" />
            <span className={`bg-gradient-to-r ${activeTabConfig.color} bg-clip-text text-transparent font-medium`}>
              {activeTabConfig.label}
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Chat Panel */}
      {showChat && currentRecruiter && (
        <ChatPanel currentUserId={currentRecruiter.id} currentUserName={currentRecruiter.name} />
      )}

      {/* Referral Modal */}
      <AnimatePresence>
        {showReferral && currentRecruiter && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowReferral(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Gift className="w-5 h-5 text-yellow-500" /> Share & Earn
                  </h2>
                  <button onClick={() => setShowReferral(false)} className="p-1 hover:bg-gray-700 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-gray-300 mb-4">
                  Share your unique referral link. When someone clicks it, you earn <strong>10 reward points</strong>!
                </p>
                <div className="bg-gray-800 p-3 rounded-lg mb-4 flex items-center justify-between">
                  <code className="text-sm text-gray-300 truncate">
                    {window.location.origin}/admission/{currentRecruiter.referral_code}
                  </code>
                  <button
                    onClick={copyReferralLink}
                    className="ml-2 p-1.5 bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-400">Current points: {rewardPoints}</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Lead Modal, AI Import Modal, Assign Lead Modal can be added similarly (not included for brevity) */}
      <NotificationToast />
    </div>
  );
}
