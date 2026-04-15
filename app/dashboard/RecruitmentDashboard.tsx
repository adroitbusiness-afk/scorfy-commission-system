'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { analyzeLead, generateReply, AnalyzedLead } from '@/lib/aiLeadEngine';
import {
  RefreshCw,
  Users,
  UserPlus,
  Award,
  TrendingUp,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Mail,
  Phone,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Star,
  Target,
  Zap,
  BarChart3,
  Send,
  Brain,
  Tag,
  Flame,
  ThumbsUp,
  FileText,
  MessageCircle,
} from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// Gamified Card Component
// ============================================================================
const GamifiedCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
  <div className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg transform transition hover:scale-105`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm opacity-90">{title}</p>
        <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
      </div>
      <div className="text-4xl">{icon}</div>
    </div>
  </div>
);

// ============================================================================
// Types
// ============================================================================
interface LeadWithAI extends AnalyzedLead {
  id: string;
  assigned_recruiter?: string;
  created_at: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
}

interface Recruiter {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
  active_leads: number;
  max_leads: number;
  status: 'active' | 'inactive';
  joined_date: string;
  total_leads_assigned?: number;
  converted_leads?: number;
  total_commission?: number;
}

interface RecruiterAction {
  id: string;
  lead_id: string;
  action_type: 'whatsapp' | 'email' | 'call';
  status: 'sent' | 'delivered' | 'answered' | 'unanswered';
  notes?: string;
  created_at: string;
}

// ============================================================================
// Main Dashboard Component
// ============================================================================
export default function RecruitmentDashboard() {
  // State
  const [leads, setLeads] = useState<LeadWithAI[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [actions, setActions] = useState<RecruiterAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterIntent, setFilterIntent] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null);
  const [availableLeads, setAvailableLeads] = useState<LeadWithAI[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');

  // Stats derived from AI analysis
  const [stats, setStats] = useState({
    totalLeads: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    readyToApply: 0,
    priceSensitive: 0,
    seekingInfo: 0,
    avgScore: 0,
    // Action stats for today
    todayMessages: 0,
    todayCalls: 0,
    todayAnswered: 0,
    todayUnanswered: 0,
  });

  // Priority color map
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'ready_to_apply': return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case 'price_sensitive': return <DollarSign className="w-4 h-4 text-yellow-600" />;
      case 'seeking_info': return <Brain className="w-4 h-4 text-blue-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // ==========================================================================
  // Data Loading with AI Analysis & Action Tracking
  // ==========================================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch leads
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Apply AI analysis
      const analyzedLeads: LeadWithAI[] = (leadsData || []).map((lead) => {
        if (lead.lead_score !== undefined && lead.intent && lead.priority) {
          return {
            ...lead,
            score: lead.lead_score,
            intent: lead.intent,
            priority: lead.priority,
            action: lead.recommended_action || 'follow_up',
            tags: lead.tags ? lead.tags.split(',') : [],
            status: lead.status,
          };
        } else {
          const analyzed = analyzeLead({
            name: lead.name,
            email: lead.email,
            phone: lead.phone,
            notes: lead.notes,
            country: lead.country,
          });
          supabase
            .from('leads')
            .update({
              lead_score: analyzed.score,
              intent: analyzed.intent,
              priority: analyzed.priority,
              recommended_action: analyzed.action,
              tags: analyzed.tags.join(','),
            })
            .eq('id', lead.id)
            .then();
          return { ...lead, ...analyzed };
        }
      });
      setLeads(analyzedLeads);

      // Fetch recruiters
      const { data: recruitersData, error: recError } = await supabase
        .from('recruiters')
        .select('*')
        .order('name');
      if (!recError) setRecruiters(recruitersData || []);

      // Fetch today's actions
      const today = new Date().toISOString().split('T')[0];
      const { data: actionsData } = await supabase
        .from('recruiter_actions')
        .select('*')
        .gte('created_at', today)
        .lte('created_at', today + 'T23:59:59');
      setActions(actionsData || []);

      // Compute stats
      const total = analyzedLeads.length;
      const high = analyzedLeads.filter(l => l.priority === 'high').length;
      const medium = analyzedLeads.filter(l => l.priority === 'medium').length;
      const low = analyzedLeads.filter(l => l.priority === 'low').length;
      const ready = analyzedLeads.filter(l => l.intent === 'ready_to_apply').length;
      const price = analyzedLeads.filter(l => l.intent === 'price_sensitive').length;
      const info = analyzedLeads.filter(l => l.intent === 'seeking_info').length;
      const avgScore = total ? Math.round(analyzedLeads.reduce((s, l) => s + l.score, 0) / total) : 0;

      const todayMessages = (actionsData || []).filter(a => a.action_type === 'whatsapp' || a.action_type === 'email').length;
      const todayCalls = (actionsData || []).filter(a => a.action_type === 'call').length;
      const todayAnswered = (actionsData || []).filter(a => a.status === 'answered').length;
      const todayUnanswered = (actionsData || []).filter(a => a.status === 'unanswered').length;

      setStats({
        totalLeads: total,
        highPriority: high,
        mediumPriority: medium,
        lowPriority: low,
        readyToApply: ready,
        priceSensitive: price,
        seekingInfo: info,
        avgScore,
        todayMessages,
        todayCalls,
        todayAnswered,
        todayUnanswered,
      });

      // Generate AI suggestion
      generateAISuggestion(analyzedLeads, actionsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // AI Suggestion Generator
  const generateAISuggestion = (leadsData: LeadWithAI[], actionsData: RecruiterAction[]) => {
    const highPriorityUncontacted = leadsData.filter(l => l.priority === 'high' && l.status === 'new').length;
    const readyToApplyUncontacted = leadsData.filter(l => l.intent === 'ready_to_apply' && l.status === 'new').length;
    const todayCalls = actionsData.filter(a => a.action_type === 'call').length;
    const todayMessages = actionsData.filter(a => a.action_type === 'whatsapp' || a.action_type === 'email').length;

    let suggestion = '';
    if (highPriorityUncontacted > 0) {
      suggestion = `⚠️ You have ${highPriorityUncontacted} high-priority leads that have not been contacted yet. Reach out to them first to increase conversion.`;
    } else if (readyToApplyUncontacted > 0) {
      suggestion = `🎯 ${readyToApplyUncontacted} leads are ready to apply. Send them the application link today.`;
    } else if (todayCalls === 0 && todayMessages === 0) {
      suggestion = `📞 You haven't made any calls or sent messages today. Start with the top 5 high-score leads.`;
    } else {
      suggestion = `📈 Great job! You've made ${todayCalls} calls and ${todayMessages} messages today. Keep following up with qualified leads.`;
    }
    setAiSuggestion(suggestion);
  };

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('recruitment-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruiter_actions' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // ==========================================================================
  // Action Tracking Functions
  // ==========================================================================
  const logAction = async (leadId: string, actionType: 'whatsapp' | 'email' | 'call', status: 'sent' | 'answered' | 'unanswered', notes?: string) => {
    try {
      await supabase.from('recruiter_actions').insert({
        recruiter_id: (await supabase.auth.getUser()).data.user?.id,
        lead_id: leadId,
        action_type: actionType,
        status,
        notes,
      });
      loadData(); // refresh stats
    } catch (err) {
      console.error('Failed to log action', err);
    }
  };

  const sendWhatsApp = async (lead: LeadWithAI) => {
    const message = generateReply(lead);
    const phone = lead.phone.replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    await logAction(lead.id, 'whatsapp', 'sent', `Message: ${message.substring(0, 100)}`);
    // Optionally update lead status
    if (lead.status === 'new') {
      await supabase.from('leads').update({ status: 'contacted' }).eq('id', lead.id);
      loadData();
    }
  };

  const makeCall = async (lead: LeadWithAI) => {
    const phone = lead.phone.replace(/\D/g, '');
    window.location.href = `tel:${phone}`;
    // We'll log after the call; user can later update status via a button
    await logAction(lead.id, 'call', 'sent', 'Call initiated');
  };

  const sendEmail = async (lead: LeadWithAI) => {
    const subject = 'Application Follow-up';
    const body = generateReply(lead);
    window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await logAction(lead.id, 'email', 'sent', `Email: ${body.substring(0, 100)}`);
    if (lead.status === 'new') {
      await supabase.from('leads').update({ status: 'contacted' }).eq('id', lead.id);
      loadData();
    }
  };

  // ==========================================================================
  // Daily Report Generation
  // ==========================================================================
  const generateDailyReport = async () => {
    setGeneratingReport(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const reportData = {
        date: today,
        leads: {
          total: stats.totalLeads,
          highPriority: stats.highPriority,
          readyToApply: stats.readyToApply,
        },
        actions: {
          messages: stats.todayMessages,
          calls: stats.todayCalls,
          answered: stats.todayAnswered,
          unanswered: stats.todayUnanswered,
        },
        nextSteps: [
          `Contact ${stats.highPriority} high-priority leads`,
          `Send application links to ${stats.readyToApply} ready-to-apply leads`,
          `Follow up with ${stats.todayUnanswered} unanswered calls`,
        ],
        aiInsight: aiSuggestion,
      };

      // Store in database
      await supabase.from('daily_reports').upsert({
        recruiter_id: (await supabase.auth.getUser()).data.user?.id,
        report_date: today,
        report_data: reportData,
      });

      // Generate a text file for download
      const reportText = `
========================================
DAILY RECRUITMENT REPORT - ${today}
========================================

📊 LEAD OVERVIEW
- Total Leads: ${reportData.leads.total}
- High Priority: ${reportData.leads.highPriority}
- Ready to Apply: ${reportData.leads.readyToApply}

📞 COMMUNICATION ACTIONS
- Messages Sent: ${reportData.actions.messages}
- Calls Made: ${reportData.actions.calls}
- Answered: ${reportData.actions.answered}
- Unanswered: ${reportData.actions.unanswered}

🤖 AI INSIGHT
${reportData.aiInsight}

📋 NEXT STEPS
${reportData.nextSteps.map((s, i) => `${i+1}. ${s}`).join('\n')}
      `;

      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recruitment_report_${today}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate report', err);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // ==========================================================================
  // Lead Assignment Logic (unchanged)
  // ==========================================================================
  const handleAssignClick = (recruiter: Recruiter) => {
    setSelectedRecruiter(recruiter);
    const unassignedLeads = leads.filter((lead) => !lead.assigned_recruiter && lead.status !== 'converted');
    setAvailableLeads(unassignedLeads);
    setSelectedLeadIds([]);
    setShowAssignModal(true);
  };

  const assignLeads = async () => {
    if (!selectedRecruiter || selectedLeadIds.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(
        selectedLeadIds.map((leadId) =>
          supabase
            .from('leads')
            .update({ assigned_recruiter: selectedRecruiter.id })
            .eq('id', leadId)
        )
      );
      setShowAssignModal(false);
      loadData();
    } catch (error) {
      console.error('Error assigning leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (filterPriority !== 'all' && lead.priority !== filterPriority) return false;
    if (filterIntent !== 'all' && lead.intent !== filterIntent) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        lead.name.toLowerCase().includes(term) ||
        lead.email.toLowerCase().includes(term) ||
        lead.phone.includes(term)
      );
    }
    return true;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW', minimumFractionDigits: 0 }).format(value);

  if (loading && stats.totalLeads === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" /> AI Recruitment Intelligence
          </h2>
          <p className="text-gray-500 text-sm">AI-powered lead scoring, action tracking & daily reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateDailyReport}
            disabled={generatingReport}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <FileText size={16} /> {generatingReport ? 'Generating...' : 'Daily Report'}
          </button>
          <button onClick={loadData} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* AI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GamifiedCard title="Total Leads" value={stats.totalLeads} icon="🎯" color="from-purple-600 to-indigo-600" />
        <GamifiedCard title="Avg. AI Score" value={stats.avgScore} icon="⚡" color="from-blue-600 to-cyan-600" />
        <GamifiedCard title="High Priority" value={stats.highPriority} icon="🔥" color="from-red-600 to-orange-600" />
        <GamifiedCard title="Ready to Apply" value={stats.readyToApply} icon="✅" color="from-green-600 to-teal-600" />
      </div>

      {/* AI Assistant & Action Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Suggestion Card */}
        <div className="lg:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <Brain className="w-8 h-8 text-purple-600 mt-1" />
            <div>
              <h3 className="font-semibold text-lg">AI Assistant Suggestion</h3>
              <p className="text-gray-700 mt-1">{aiSuggestion}</p>
            </div>
          </div>
        </div>

        {/* Today's Action Stats */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h3 className="font-semibold text-lg flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Today's Activity</h3>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between"><span>Messages Sent</span><span className="font-bold">{stats.todayMessages}</span></div>
            <div className="flex justify-between"><span>Calls Made</span><span className="font-bold">{stats.todayCalls}</span></div>
            <div className="flex justify-between"><span>Answered</span><span className="text-green-600">{stats.todayAnswered}</span></div>
            <div className="flex justify-between"><span>Unanswered</span><span className="text-red-600">{stats.todayUnanswered}</span></div>
          </div>
        </div>
      </div>

      {/* Narrative Analytics (replaces charts) */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="font-semibold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Performance Narrative</h3>
        <div className="mt-3 text-gray-700 leading-relaxed">
          <p>
            You have <strong>{stats.totalLeads}</strong> total leads. Among them, <strong>{stats.highPriority}</strong> are high-priority (need immediate attention), 
            and <strong>{stats.readyToApply}</strong> are ready to apply. Your average AI lead score is <strong>{stats.avgScore}</strong>.
          </p>
          <p className="mt-2">
            Today you've sent <strong>{stats.todayMessages}</strong> messages and made <strong>{stats.todayCalls}</strong> calls. 
            {stats.todayAnswered > 0 ? ` ${stats.todayAnswered} were answered – great engagement!` : ' No answers yet – try calling at different times.'}
          </p>
          <p className="mt-2">
            <strong>Next focus:</strong> {stats.highPriority > 0 ? `Contact ${stats.highPriority} high-priority leads` : 'Follow up with qualified leads'} 
            and send application links to {stats.readyToApply} ready-to-apply leads.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <select
          value={filterIntent}
          onChange={(e) => setFilterIntent(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm bg-white"
        >
          <option value="all">All Intents</option>
          <option value="ready_to_apply">Ready to Apply</option>
          <option value="price_sensitive">Price Sensitive</option>
          <option value="seeking_info">Seeking Info</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Leads Table with Action Tracking */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">AI Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Intent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-gray-400">ID: {lead.id.slice(0,8)}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {lead.email}<br/>{lead.phone}
                  </td>
                  <td className="px-6 py-4 text-sm max-w-xs truncate">{lead.notes || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1 text-sm capitalize">
                      {getIntentIcon(lead.intent)}
                      {lead.intent.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(lead.priority)}`}>
                      {lead.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => sendWhatsApp(lead)}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                        title="Send WhatsApp"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        onClick={() => makeCall(lead)}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                        title="Call"
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        onClick={() => sendEmail(lead)}
                        className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
                        title="Send Email"
                      >
                        <Mail size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No leads found. </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recruiters Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">Recruiters</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recruiter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Converted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recruiters.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold">
                        {rec.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{rec.name}</p>
                        <p className="text-xs text-gray-500">{rec.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{rec.department}</td>
                  <td className="px-6 py-4 text-sm">
                    {rec.total_leads_assigned || 0} / {rec.max_leads}
                    <div className="w-20 h-1 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${((rec.total_leads_assigned || 0) / rec.max_leads) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{rec.converted_leads || 0}</td>
                  <td className="px-6 py-4 text-sm font-medium text-green-600">
                    {formatCurrency(rec.total_commission || 0)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${rec.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleAssignClick(rec)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="Assign Leads"
                    >
                      <UserPlus size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Leads Modal (unchanged) */}
      {showAssignModal && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Assign Leads to {selectedRecruiter.name}</h3>
                <p className="text-sm text-gray-500">
                  Capacity: {selectedRecruiter.active_leads} / {selectedRecruiter.max_leads}
                </p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {availableLeads.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No unassigned leads available.</p>
              ) : (
                <div className="space-y-3">
                  {availableLeads.map((lead) => (
                    <label
                      key={lead.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        selectedLeadIds.includes(lead.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{lead.name}</p>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Mail size={14} /> {lead.email}</span>
                          <span className="flex items-center gap-1"><Phone size={14} /> {lead.phone}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{lead.status}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={assignLeads}
                disabled={selectedLeadIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Assign {selectedLeadIds.length} Lead{selectedLeadIds.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}