'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getScorfyAnalytics } from '@/lib/scorfyAnalytics';
import { useRouter } from 'next/navigation';
import {
  analyzeLead,
  generateReply,
  calculateLeadAnalytics,
  suggestNextSteps,
  generateDailyEngagementContent,
  AnalyzedLead
} from '@/lib/aiLeadEngine';
import {
  Users, TrendingUp, DollarSign, Award, Gift, Copy, Clock, Phone, Mail, UserPlus,
  RefreshCw, MessageCircle, LogOut, Menu, X, Bell, Brain, Target, Search, Star, Flame,
  Loader2, ChevronDown, ChevronUp, Send, CheckCircle, AlertCircle, Upload,
  Plus, MessageSquare, Edit, Trash2, LayoutDashboard, FileText, Settings, Share2, FileBarChart,
  Calendar as CalendarIcon, Zap, Sparkles, Calendar
} from 'lucide-react';
import { FaFacebook, FaTwitter, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { format } from 'date-fns';

// ============================================================================
// Helper Functions
// ============================================================================
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(value || 0);

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700 border border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
    default: return 'bg-green-100 text-green-700 border border-green-200';
  }
};

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700 border border-gray-200',
    contacted: 'bg-blue-100 text-blue-700 border border-blue-200',
    qualified: 'bg-purple-100 text-purple-700 border border-purple-200',
    converted: 'bg-green-100 text-green-700 border border-green-200',
    lost: 'bg-red-100 text-red-700 border border-red-200',
  };
  return styles[status] || styles.new;
};

const getIntentIcon = (intent: string) => {
  switch (intent) {
    case 'ready_to_apply': return <Star className="w-4 h-4 text-green-600" />;
    case 'price_sensitive': return <DollarSign className="w-4 h-4 text-yellow-600" />;
    case 'seeking_info': return <Brain className="w-4 h-4 text-blue-600" />;
    default: return <Target className="w-4 h-4 text-gray-400" />;
  }
};

// Message templates
const messageTemplates: Record<string, { title: string; content: string }> = {
  default: { title: 'AI Suggested Follow-up', content: 'Hello {name},\n\nI wanted to share some key program highlights and next steps to help you apply quickly.\n\nBest regards,\nYour Enrollment Advisor' },
  warm_followup: { title: 'Warm Follow-up', content: 'Hello {name},\n\nI hope you are well. I wanted to share some key program highlights and next steps to help you apply quickly.\n\nPlease reply if you would like the application link and support to complete your submission.\n\nBest regards,\nYour Enrollment Advisor' },
  program_highlight: { title: 'Program Highlights', content: 'Hi {name},\n\nOur {program} intake is open now and spots are limited. This programme is designed to help you build a strong career path.\n\nLet me know if you want the application form and next steps today.\n\nThanks,\nEnrollment Team' },
  checklist: { title: 'Document Checklist', content: 'Hello {name},\n\nYour application is almost ready. Please complete the following items:\n1. Submit your admission form\n2. Upload your ID and transcripts\n3. Confirm your chosen programme\n\nReply if you need help with any step.\n\nBest,\nEnrollment Team' },
};

const formatTemplateMessage = (templateKey: string, lead: Partial<AnalyzedLead> & { institution?: string }) => {
  const template = messageTemplates[templateKey] || messageTemplates.default;
  return template.content
    .replace(/\{name\}/g, lead.name || 'there')
    .replace(/\{program\}/g, lead.program || 'your chosen programme')
    .replace(/\{institution\}/g, lead.institution || 'your preferred institution');
};

// ============================================================================
// Offline Queue (IndexedDB)
// ============================================================================
class OfflineQueue {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'recruiter_offline';
  private readonly STORE_NAME = 'events';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { autoIncrement: true });
        }
      };
    });
  }

  async addEvent(event: any): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    store.add(event);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  }

  async getEvents(): Promise<any[]> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearEvents(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    store.clear();
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  }
}

const offlineQueue = new OfflineQueue();

// ============================================================================
// AI Content Generator (for referral sharing)
// ============================================================================
const generateWhatsAppStatus = (): string => {
  const templates = [
    "🚀 Join me as a recruiter on our platform! Earn commissions and rewards. Use my referral link: {link}",
    "💰 Turn leads into income! Become a recruitment partner. Sign up with my link and start earning today.",
    "🎓 Help students achieve their dreams and get paid. Recruit with me and unlock bonuses!",
    "🔥 Limited time: Double commission for first 10 referrals! Join using my link now.",
  ];
  return templates[Math.floor(Math.random() * templates.length)];
};

// ============================================================================
// Sub-components (Sidebar, TemplateLibrary, FileUploadModal)
// ============================================================================
function Sidebar({ recruiter, sidebarOpen, notifications, activeSection, onSectionChange, onLogout }: any) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quick-admission', label: 'Quick Admission', icon: FileText },
    { id: 'leads', label: 'My Leads', icon: Users },
    { id: 'templates', label: 'Template Library', icon: FileText },
    { id: 'bulk-messaging', label: 'Bulk Messaging', icon: MessageSquare },
    { id: 'sharing', label: 'Lead Sharing', icon: Share2 },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'claims', label: 'Claims', icon: DollarSign },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Brain },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleClick = (id: string) => {
    onSectionChange(id);
  };

  return (
    <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-white shadow-xl border-r`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-gray-800">Recruiter Portal</span>
        </div>
        <button onClick={() => onToggleSidebar(false)} className="lg:hidden text-gray-500">
          <X size={20} />
        </button>
      </div>
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <p className="text-sm text-gray-500">Welcome,</p>
        <p className="font-semibold text-gray-800">{recruiter?.name || 'Recruiter'}</p>
        <p className="text-xs text-gray-500">{recruiter?.email}</p>
      </div>
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeSection === item.id
                ? 'bg-blue-50 text-blue-600 shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

function TemplateLibrary({ recruiterId }: { recruiterId: string }) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!recruiterId) return;
    fetchTemplates();
  }, [recruiterId]);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('recruiter_id', recruiterId)
      .order('created_at', { ascending: false });
    setTemplates(data || []);
  };

  const saveTemplate = async () => {
    if (!title || !content) return;
    setLoading(true);
    try {
      if (editingTemplate) {
        await supabase
          .from('message_templates')
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq('id', editingTemplate.id);
      } else {
        await supabase.from('message_templates').insert({
          recruiter_id: recruiterId,
          title,
          content,
        });
      }
      await fetchTemplates();
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (confirm('Delete this template?')) {
      await supabase.from('message_templates').delete().eq('id', id);
      await fetchTemplates();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  const resetForm = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setTitle('');
    setContent('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Message Templates</h3>
        <button onClick={() => setShowModal(true)} className="px-3 py-1 bg-blue-600 text-white rounded-lg flex items-center gap-1">
          <Plus size={16} /> New Template
        </button>
      </div>
      {templates.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No templates yet. Create one to speed up replies.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-gray-800">{template.title}</h4>
                <div className="flex gap-1">
                  <button onClick={() => copyToClipboard(template.content)} className="p-1 text-gray-500 hover:text-blue-600"><Copy size={16} /></button>
                  <button onClick={() => { setEditingTemplate(template); setTitle(template.title); setContent(template.content); setShowModal(true); }} className="p-1 text-gray-500 hover:text-green-600"><Edit size={16} /></button>
                  <button onClick={() => deleteTemplate(template.id)} className="p-1 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{template.content.substring(0, 150)}...</p>
              <p className="text-xs text-gray-400 mt-2">{new Date(template.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">{editingTemplate ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={resetForm} className="text-gray-500"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Template Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded-lg" />
              <textarea rows={6} placeholder="Message content (use {name}, {program}, {institution})" value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-3 border rounded-lg" />
              <div className="flex justify-end gap-3">
                <button onClick={resetForm} className="px-4 py-2 border rounded-lg">Cancel</button>
                <button onClick={saveTemplate} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">{loading ? 'Saving...' : 'Save Template'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileUploadModal({ isOpen, onClose, onLeadsExtracted, institutions, selectedInstitution, onInstitutionChange, recruiter }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    if (selectedInstitution) formData.append('institution_id', selectedInstitution);
    if (recruiter?.user_id) formData.append('recruiter_id', recruiter.user_id);
    const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 200);
    try {
      const res = await fetch('/api/leads/ingest', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.inserted !== undefined || data.updated !== undefined) {
        alert(`Imported ${data.inserted || 0} new leads, updated ${data.updated || 0} leads.`);
        onClose();
        onLeadsExtracted();
      } else {
        alert('No leads extracted');
      }
    } catch (err) {
      console.error(err);
      alert('Extraction failed');
    } finally {
      clearInterval(interval);
      setUploading(false);
      setProgress(0);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Import Leads</h3>
          <button onClick={onClose} className="text-gray-500"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution (Optional)</label>
            <select value={selectedInstitution} onChange={(e) => onInstitutionChange(e.target.value)} className="w-full p-2 border rounded-lg">
              <option value="">Select Institution</option>
              {institutions.map((inst: any) => (
                <option key={inst.id} value={inst.id}>{inst.institution_name}</option>
              ))}
            </select>
          </div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input type="file" accept=".csv,.xlsx,.xls,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="import-file" />
            <label htmlFor="import-file" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
              <Upload size={18} /> Choose File
            </label>
            {file && <p className="mt-2 text-sm text-gray-600">{file.name}</p>}
          </div>
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }} /></div>
              <p className="text-sm text-center text-gray-500">Processing...</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button onClick={handleUpload} disabled={!file || uploading} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">Import</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
export default function RecruiterDashboard() {
  const router = useRouter();
  const [recruiter, setRecruiter] = useState<any>(null);
  const [leads, setLeads] = useState<AnalyzedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedLeads, setSelectedLeads] = useState<Set<string | undefined>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [notifications, setNotifications] = useState(0);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [institutions, setInstitutionsList] = useState<any[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'default' | 'warm_followup' | 'program_highlight' | 'checklist'>('default');
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [commissions, setCommissions] = useState<any[]>([]);
  const [markingCommissionId, setMarkingCommissionId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalLeads: 0, converted: 0, pendingCommissions: 0, paidCommissions: 0, rewardPoints: 0,
    avgScore: 0, highPriorityCount: 0, readyToApplyCount: 0, pendingTasks: 0, feedbackPoints: 0,
    level: 1, points: 0,
  });

  // Analytics state
  const [todayActions, setTodayActions] = useState({
    messages: 0,
    calls: 0,
    answered: 0,
    unanswered: 0,
  });
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Gamification & Referral states
  const [shortLink, setShortLink] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showAchievement, setShowAchievement] = useState<{ message: string; points: number } | null>(null);
  const [referralStats, setReferralStats] = useState({ clicks: 0, conversions: 0, pointsFromReferrals: 0 });
  const subscriptionRef = useRef<any>(null);
  const isLoadingRef = useRef(false);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterPriority, searchTerm, sortBy, sortOrder]);

  // Service Worker Background Sync (PWA offline support)
  useEffect(() => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.sync.register('sync-leads').catch(err => console.log('Sync registration failed', err));
      });
    }
  }, []);

  // Offline sync (only when recruiter exists)
  useEffect(() => {
    const handleOnline = () => { setOnline(true); if (recruiter && !isLoadingRef.current) syncOfflineEvents(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    offlineQueue.init().then(() => {
      if (recruiter && !isLoadingRef.current) syncOfflineEvents();
    });
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [recruiter]);

  const syncOfflineEvents = async () => {
    if (!recruiter) return;
    const recruiterId = recruiter.user_id;
    const events = await offlineQueue.getEvents();
    if (events.length === 0) return;
    for (const event of events) {
      try {
        if (event.type === 'click') {
          await supabase.from('recruiter_referral_clicks').insert({
            recruiter_id: recruiterId,
            clicked_at: event.timestamp,
            referrer_url: event.url,
          });
          await addPoints('Referral click', 5);
        } else if (event.type === 'share') {
          await addPoints('Social share', 20);
        }
      } catch (err) { console.error('Sync failed', err); }
    }
    await offlineQueue.clearEvents();
    loadData();
  };

  const addPoints = async (reason: string, points: number) => {
    if (!recruiter) return;
    const recruiterId = recruiter.user_id;
    const { error: updateError } = await supabase.rpc('increment_recruiter_points', { recruiter_id: recruiterId, points_added: points });
    if (updateError) console.error('Points update failed', updateError);
    await supabase.from('recruiter_point_transactions').insert({ recruiter_id: recruiterId, points, reason });
    setShowAchievement({ message: reason, points });
    setTimeout(() => setShowAchievement(null), 3000);
    loadData();
  };

  const dailyCheckIn = async () => {
    if (!recruiter) return;
    const recruiterId = recruiter.user_id;
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('recruiter_points')
      .select('daily_checkin_last')
      .eq('recruiter_id', recruiterId)
      .maybeSingle();
    if (existing?.daily_checkin_last === today) {
      alert('You already checked in today!');
      return;
    }
    await supabase
      .from('recruiter_points')
      .update({ daily_checkin_last: today })
      .eq('recruiter_id', recruiterId);
    await addPoints('Daily check-in', 10);
  };

  // Action tracking helpers
  const logAction = async (leadId: string, actionType: 'whatsapp' | 'email' | 'call', status: 'sent' | 'answered' | 'unanswered', notes?: string) => {
    if (!recruiter) return;
    const recruiterId = recruiter.user_id;
    await supabase.from('recruiter_actions').insert({
      recruiter_id: recruiterId,
      lead_id: leadId,
      action_type: actionType,
      status,
      notes,
    });
    await refreshAnalytics(recruiterId);
  };

  const refreshAnalytics = async (recruiterId: string) => {
    const analytics = await getScorfyAnalytics(recruiterId);
    setAiSuggestion(analytics.suggestion);
    setTodayActions({
      messages: analytics.insights.messagesToday,
      calls: analytics.insights.callsToday,
      answered: Math.round(analytics.insights.answeredRate * analytics.insights.callsToday / 100),
      unanswered: analytics.insights.callsToday - Math.round(analytics.insights.answeredRate * analytics.insights.callsToday / 100),
    });
  };

  const fetchAdmissionsCount = async (recruiterId: string) => {
    const { count, error } = await supabase
      .from('admissions')
      .select('*', { count: 'exact', head: true })
      .eq('admitted_by', recruiterId);
    return error ? 0 : count || 0;
  };

  const generateDailyReport = async () => {
    if (!recruiter) return;
    const recruiterId = recruiter.user_id;
    setGeneratingReport(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const admissionsCount = await fetchAdmissionsCount(recruiterId);
      const analytics = await getScorfyAnalytics(recruiterId);
      const reportData = {
        date: today,
        leads: {
          total: stats.totalLeads,
          highPriority: stats.highPriorityCount,
          readyToApply: stats.readyToApplyCount,
        },
        actions: {
          messages: analytics.insights.messagesToday,
          calls: analytics.insights.callsToday,
          answered: Math.round(analytics.insights.answeredRate * analytics.insights.callsToday / 100),
          unanswered: analytics.insights.callsToday - Math.round(analytics.insights.answeredRate * analytics.insights.callsToday / 100),
        },
        nextSteps: analytics.nextSteps,
        aiInsight: analytics.suggestion,
        admissionsGenerated: admissionsCount,
      };

      await supabase.from('daily_reports').upsert({
        recruiter_id: recruiterId,
        report_date: today,
        report_data: reportData,
      });

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

📄 ADMISSIONS GENERATED
- Total Admissions: ${reportData.admissionsGenerated}

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

  // Action handlers with tracking
  const sendWhatsApp = async (lead: AnalyzedLead) => {
    const message = formatTemplateMessage(selectedTemplate, lead);
    const phone = lead.phone?.replace(/\D/g, '');
    if (!phone) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    await logAction(lead.id, 'whatsapp', 'sent', `Message: ${message.substring(0, 100)}`);
    if (lead.status === 'new' && lead.id) await updateLeadStatus(lead.id, 'contacted', 'sent_whatsapp');
    loadData();
  };

  const sendEmail = async (lead: AnalyzedLead) => {
    const subject = messageTemplates[selectedTemplate]?.title || 'Enrollment Steps';
    const body = formatTemplateMessage(selectedTemplate, lead);
    window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await logAction(lead.id, 'email', 'sent', `Email: ${body.substring(0, 100)}`);
    if (lead.status === 'new' && lead.id) updateLeadStatus(lead.id, 'contacted', 'sent_email');
  };

  const makeCall = (lead: AnalyzedLead) => {
    const phone = lead.phone?.replace(/\D/g, '');
    if (phone?.startsWith('260') && lead.id) {
      window.location.href = `tel:${phone}`;
      logAction(lead.id, 'call', 'sent', 'Call initiated');
      updateLeadStatus(lead.id, 'contacted', 'made_call');
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string, action?: string) => {
    try {
      await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (action && recruiter) {
        const points = 5;
        const recruiterId = recruiter.user_id;
        await supabase.from('recruiter_feedback').insert({
          recruiter_id: recruiterId,
          lead_id: leadId,
          action_taken: action,
          points_earned: points,
          notes: `Status updated to ${newStatus}`,
        });
        await addPoints(`Lead ${action}`, points);
        loadData();
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const markCommissionPaid = async (commissionId: string) => {
    try {
      setMarkingCommissionId(commissionId);
      const res = await fetch('/api/commissions/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_id: commissionId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to mark commission paid');
      }
      loadData();
    } catch (error) {
      console.error(error);
      alert((error as any)?.message || 'Unable to mark paid');
    } finally {
      setMarkingCommissionId(null);
    }
  };

  const handleLeadsExtracted = async () => {
    await loadData();
  };

  // Main data loader
  const loadData = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data: recruiterData, error: recruiterError } = await supabase
        .from('recruiters')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (recruiterError || !recruiterData) {
        console.error('Recruiter not found');
        router.push('/dashboard');
        return;
      }
      const recruiterUserId = recruiterData.user_id;
      setRecruiter(recruiterData);

      // Points & level
      const { data: pointsData } = await supabase
        .from('recruiter_points')
        .select('points, level, badges')
        .eq('recruiter_id', recruiterUserId)
        .maybeSingle();
      const points = pointsData?.points || 0;
      const level = pointsData?.level || 1;
      const badges = pointsData?.badges || [];

      const { data: institutionsData } = await supabase
        .from('institutions')
        .select('id, institution_name, institution_code');
      setInstitutionsList(institutionsData || []);

      // Leads
      let query = supabase
        .from('leads')
        .select('*')
        .eq('assigned_recruiter', recruiterUserId)
        .order(sortBy === 'date' ? 'created_at' : 'lead_score', { ascending: sortOrder === 'asc' });
      const { data: leadsData, error: leadsError } = await query;
      if (leadsError) throw leadsError;

      const analyzed = await Promise.all((leadsData || []).map(async (lead) => {
        if (lead.lead_score !== undefined && lead.intent && lead.priority) {
          return { ...lead, phone: lead.phone || '', program: lead.program };
        } else {
          const analyzedLead = analyzeLead({
            name: lead.name, email: lead.email, phone: lead.phone || '', notes: lead.notes, country: lead.country,
          });
          supabase
            .from('leads')
            .update({
              lead_score: analyzedLead.score,
              intent: analyzedLead.intent,
              priority: analyzedLead.priority,
              recommended_action: analyzedLead.action,
              tags: (analyzedLead.tags || []).join(','),
            })
            .eq('id', lead.id)
            .then(({ error }) => {
              if (error) console.error('AI update error for lead', lead.id, ':', error.message);
            });
          return { ...lead, ...analyzedLead, phone: lead.phone || '', program: lead.program };
        }
      }));
      setLeads(analyzed);

      // Commissions
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select('*')
        .eq('recruiter_id', recruiterUserId);
      setCommissions(commissionsData || []);
      const pendingComm = commissionsData?.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0) || 0;
      const paidComm = commissionsData?.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0) || 0;

      const total = analyzed.length;
      const converted = analyzed.filter(l => l.status === 'converted').length;
      const highPriority = analyzed.filter(l => l.priority === 'high').length;
      const readyToApply = analyzed.filter(l => l.intent === 'ready_to_apply').length;
      const avgScore = total ? Math.round(analyzed.reduce((s, l) => s + l.score, 0) / total) : 0;
      const pendingTasks = analyzed.filter(l => l.status !== 'converted' && l.status !== 'lost').length;

      let feedbackPoints = 0;
      const { data: feedbackData } = await supabase
        .from('recruiter_feedback')
        .select('points_earned')
        .eq('recruiter_id', recruiterUserId);
      feedbackPoints = feedbackData?.reduce((sum, f) => sum + f.points_earned, 0) || 0;

      setStats({
        totalLeads: total, converted, pendingCommissions: pendingComm, paidCommissions: paidComm, rewardPoints: points,
        avgScore, highPriorityCount: highPriority, readyToApplyCount: readyToApply, pendingTasks, feedbackPoints,
        points, level,
      });

      // Get analytics
      const analytics = await getScorfyAnalytics(recruiterUserId);
      setAiSuggestion(analytics.suggestion);
      setTodayActions({
        messages: analytics.insights.messagesToday,
        calls: analytics.insights.callsToday,
        answered: Math.round(analytics.insights.answeredRate * analytics.insights.callsToday / 100),
        unanswered: analytics.insights.callsToday - Math.round(analytics.insights.answeredRate * analytics.insights.callsToday / 100),
      });

      // Referral stats
      const { count: clicks } = await supabase
        .from('recruiter_referral_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('recruiter_id', recruiterUserId);
      const { data: referrals } = await supabase
        .from('recruiter_referrals')
        .select('points_awarded')
        .eq('referrer_id', recruiterUserId);
      const conversions = referrals?.length || 0;
      const pointsFromReferrals = referrals?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) || 0;
      setReferralStats({ clicks: clicks || 0, conversions, pointsFromReferrals });

      // Short link
      const { data: existingShort } = await supabase
        .from('recruiter_short_links')
        .select('short_code')
        .eq('recruiter_id', recruiterUserId)
        .maybeSingle();
      if (existingShort) {
        setShortCode(existingShort.short_code);
        setShortLink(`${window.location.origin}/r/r/${existingShort.short_code}`);
      } else {
        const initials = recruiterData.name?.split(' ').map((n: string) => n[0]).join('') || 'REC';
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${initials}${random}`;
        const longUrl = `${window.location.origin}/recruiter/refer/${recruiterUserId}`;
        await supabase.from('recruiter_short_links').insert({ recruiter_id: recruiterUserId, short_code: code, long_url: longUrl });
        setShortCode(code);
        setShortLink(`${window.location.origin}/r/r/${code}`);
      }

    } catch (error) {
      console.error('Error loading recruiter data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [router, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    subscriptionRef.current = supabase
      .channel('recruiter-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruiter_actions' }, () => loadData())
      .subscribe();
    return () => { if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current); };
  }, [loadData]);

  // Filter & pagination
  const filteredLeads = leads.filter(lead => {
    if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
    if (filterPriority !== 'all' && lead.priority !== filterPriority) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return lead.name.toLowerCase().includes(term) || lead.email.toLowerCase().includes(term) || (lead.phone && lead.phone.includes(term));
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      return sortOrder === 'asc' ? (a.score || 0) - (b.score || 0) : (b.score || 0) - (a.score || 0);
    }
  });
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const copyShortLink = () => {
    navigator.clipboard.writeText(shortLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (online && recruiter) {
      supabase.from('recruiter_referral_clicks').insert({ recruiter_id: recruiter.user_id, clicked_at: new Date().toISOString(), referrer_url: 'copy_share' });
      addPoints('Referral click', 5);
    } else if (!online) {
      offlineQueue.addEvent({ type: 'click', url: 'copy_share', timestamp: new Date().toISOString() });
    }
  };

  const shareLink = async (platform: string) => {
    const text = `Join me as a recruiter on our platform! Earn commissions and rewards. Use my link: ${shortLink}`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shortLink)}`,
      email: `mailto:?subject=Recruiter Rewards&body=${encodeURIComponent(text)}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
    if (online && recruiter) await addPoints('Social share', 20);
    else if (!online) await offlineQueue.addEvent({ type: 'share', timestamp: new Date().toISOString() });
  };

  const generateStatus = () => {
    setGenerating(true);
    setTimeout(() => {
      const status = generateWhatsAppStatus().replace('{link}', shortLink);
      setWhatsappStatus(status);
      setGenerating(false);
    }, 500);
  };

  const handleSectionChange = (section: string) => {
    if (section === 'quick-admission') {
      router.push('/quick-admission');
    } else {
      setActiveSection(section);
    }
  };

  const levelProgress = stats.level ? ((stats.points % 500) / 500) * 100 : 0;

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  // ==========================================================================
  // JSX (unchanged – exactly the same as the original)
  // ==========================================================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Achievement Toast */}
      {showAchievement && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
          <Zap className="w-5 h-5" />
          <div>
            <p className="font-bold">+{showAchievement.points} points!</p>
            <p className="text-xs">{showAchievement.message}</p>
          </div>
        </div>
      )}

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white rounded-lg shadow-md border">
          <Menu size={20} />
        </button>
      </div>

      <Sidebar
        recruiter={recruiter}
        sidebarOpen={sidebarOpen}
        notifications={notifications}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={async () => { await supabase.auth.signOut(); router.push('/login'); }}
      />

      <div className="lg:ml-72 min-h-screen">
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {activeSection === 'dashboard' ? 'Recruiter Dashboard' : 
                   activeSection === 'leads' ? 'My Leads' :
                   activeSection === 'templates' ? 'Template Library' :
                   activeSection === 'bulk-messaging' ? 'Bulk Messaging' :
                   activeSection === 'sharing' ? 'Lead Sharing' :
                   activeSection === 'reports' ? 'Reports & Analytics' :
                   activeSection === 'claims' ? 'Commission Claims' :
                   activeSection === 'ai-assistant' ? 'AI Assistant' : 'Settings'}
                </h1>
                <p className="text-gray-500 text-sm">Your recruitment command center</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={dailyCheckIn} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-green-200">
                  <CalendarIcon size={14} /> Daily Check-in
                </button>
                <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-yellow-200">
                  <Star size={14} /> {stats.points || 0} pts (Lv.{stats.level || 1})
                </div>
                <button className="relative"><Bell size={20} className="text-gray-600" />{notifications > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}</button>
              </div>
            </div>

            {/* Level Progress Bar (dashboard only) */}
            {activeSection === 'dashboard' && (
              <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex justify-between text-sm mb-1 text-gray-600">
                  <span>Level {stats.level || 1} Progress</span>
                  <span>{(stats.points || 0) % 500}/500 XP</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500" style={{ width: `${levelProgress || 0}%` }}></div>
                </div>
              </div>
            )}

            {/* DASHBOARD SECTION (no charts) */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex justify-between"><div><p className="text-gray-500 text-sm">Total Leads</p><p className="text-3xl font-bold text-gray-900">{stats.totalLeads || 0}</p></div><Users size={32} className="opacity-80 text-blue-500" /></div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex justify-between"><div><p className="text-gray-500 text-sm">Conversions</p><p className="text-3xl font-bold text-gray-900">{stats.converted || 0}</p></div><CheckCircle size={32} className="opacity-80 text-green-500" /></div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex justify-between"><div><p className="text-gray-500 text-sm">Commission Earned</p><p className="text-3xl font-bold text-gray-900">{formatCurrency((stats.pendingCommissions || 0) + (stats.paidCommissions || 0))}</p></div><DollarSign size={32} className="opacity-80 text-yellow-500" /></div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex justify-between"><div><p className="text-gray-500 text-sm">Reward Points</p><p className="text-3xl font-bold text-gray-900">{stats.rewardPoints || 0}</p></div><Award size={32} className="opacity-80 text-purple-500" /></div>
                  </div>
                </div>

                {/* AI Assistant + Action Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Brain className="w-8 h-8 text-purple-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-lg">AI Assistant Suggestion</h3>
                        <p className="text-gray-700 mt-1">{aiSuggestion || "Analyzing your leads..."}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <h3 className="font-semibold text-lg flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Today's Activity</h3>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between"><span>Messages Sent</span><span className="font-bold">{todayActions.messages || 0}</span></div>
                      <div className="flex justify-between"><span>Calls Made</span><span className="font-bold">{todayActions.calls || 0}</span></div>
                      <div className="flex justify-between"><span>Answered</span><span className="text-green-600">{todayActions.answered || 0}</span></div>
                      <div className="flex justify-between"><span>Unanswered</span><span className="text-red-600">{todayActions.unanswered || 0}</span></div>
                    </div>
                    <button onClick={generateDailyReport} disabled={generatingReport} className="mt-4 w-full py-2 bg-purple-600 text-white rounded-lg flex items-center justify-center gap-2">
                      <FileText size={16} /> {generatingReport ? 'Generating...' : 'Generate Daily Report'}
                    </button>
                  </div>
                </div>

                {/* Narrative Analytics */}
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                  <h3 className="font-semibold text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Performance Narrative</h3>
                  <div className="mt-3 text-gray-700 leading-relaxed">
                    <p>You have <strong>{stats.totalLeads || 0}</strong> total leads. Among them, <strong>{stats.highPriorityCount || 0}</strong> are high-priority (need immediate attention), and <strong>{stats.readyToApplyCount || 0}</strong> are ready to apply. Your average AI lead score is <strong>{stats.avgScore || 0}</strong>.</p>
                    <p className="mt-2">Today you've sent <strong>{todayActions.messages || 0}</strong> messages and made <strong>{todayActions.calls || 0}</strong> calls. {todayActions.answered > 0 ? `${todayActions.answered} were answered – great engagement!` : 'No answers yet – try calling at different times.'}</p>
                    <p className="mt-2"><strong>Next focus:</strong> {stats.highPriorityCount > 0 ? `Contact ${stats.highPriorityCount} high-priority leads` : 'Follow up with qualified leads'} and send application links to {stats.readyToApplyCount || 0} ready-to-apply leads.</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Recent Activity</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle size={20} className="text-green-600" /></div>
                      <div className="flex-1"><p className="font-medium text-gray-800">Lead converted successfully</p><p className="text-sm text-gray-500">John Doe enrolled in Computer Science</p></div>
                      <span className="text-xs text-gray-400">2h ago</span>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"><MessageCircle size={20} className="text-blue-600" /></div>
                      <div className="flex-1"><p className="font-medium text-gray-800">WhatsApp message sent</p><p className="text-sm text-gray-500">Follow-up sent to 5 leads</p></div>
                      <span className="text-xs text-gray-400">4h ago</span>
                    </div>
                  </div>
                </div>

                {/* Referral Section */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><Gift className="text-blue-600" /> Recruiter Referral Program</h2>
                  <p className="text-gray-500 text-sm mb-4">Share your unique link and earn points when other recruiters join!</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 border"><code className="text-sm break-all text-gray-700">{shortLink || 'Generating...'}</code></div>
                    <button onClick={copyShortLink} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Copy size={16} />{copied ? 'Copied!' : 'Copy'}</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {['whatsapp', 'facebook', 'twitter', 'linkedin', 'email'].map(platform => (
                      <button key={platform} onClick={() => shareLink(platform)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                        {platform === 'whatsapp' && <Phone size={16} />}
                        {platform === 'facebook' && <FaFacebook size={16} />}
                        {platform === 'twitter' && <FaTwitter size={16} />}
                        {platform === 'linkedin' && <FaLinkedin size={16} />}
                        {platform === 'email' && <FaEnvelope size={16} />}
                      </button>
                    ))}
                  </div>
                  <button onClick={generateStatus} className="mt-4 text-sm text-blue-600 flex items-center gap-1"><Sparkles size={14} /> Generate WhatsApp Status</button>
                  {whatsappStatus && <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">{whatsappStatus}</div>}
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-2xl font-bold text-blue-600">{referralStats.clicks || 0}</p><p className="text-xs text-gray-500">Clicks</p></div>
                    <div><p className="text-2xl font-bold text-green-600">{referralStats.conversions || 0}</p><p className="text-xs text-gray-500">Referrals</p></div>
                    <div><p className="text-2xl font-bold text-yellow-600">{referralStats.pointsFromReferrals || 0}</p><p className="text-xs text-gray-500">Points Earned</p></div>
                  </div>
                </div>
              </div>
            )}

            {/* LEADS SECTION */}
            {activeSection === 'leads' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
                    <div className="flex gap-2">
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                        <option value="all">All Status</option><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="converted">Converted</option><option value="lost">Lost</option>
                      </select>
                      <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                        <option value="all">All Priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                      </select>
                      <div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 border rounded-lg text-sm w-64" /></div>
                      <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-2 border rounded-lg">{sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                      <button onClick={loadData} className="p-2 border rounded-lg"><RefreshCw size={18} /></button>
                      <button onClick={() => setImportModalOpen(true)} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"><Upload size={16} /> Import Leads</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50">
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="px-4 py-3">Lead</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3 text-center">AI Score</th><th className="px-4 py-3">Intent</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paginatedLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4"><p className="font-medium text-gray-900">{lead.name}</p><p className="text-xs text-gray-400">ID: {lead.id?.slice(0,8)}</p></td>
                            <td className="px-4 py-4 text-sm text-gray-600">{lead.email}<br/>{lead.phone || 'No phone'}</td>
                            <td className="px-4 py-4 text-center"><span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">{lead.score || 0}</span></td>
                            <td className="px-4 py-4"><span className="flex items-center gap-1 text-sm text-gray-700 capitalize">{getIntentIcon(lead.intent)}{lead.intent?.replace(/_/g, ' ')}</span></td>
                            <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(lead.priority)}`}>{lead.priority || 'medium'}</span></td>
                            <td className="px-4 py-4"><select value={lead.status} onChange={(e) => updateLeadStatus(lead.id!, e.target.value, 'status_change')} className={`text-xs border rounded px-2 py-1 bg-white ${getStatusBadge(lead.status)}`}><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="converted">Converted</option><option value="lost">Lost</option></select></td>
                            <td className="px-4 py-4"><div className="flex gap-1"><button onClick={() => sendWhatsApp(lead)} className="p-1.5 bg-green-100 text-green-700 rounded"><MessageCircle size={14} /></button><button onClick={() => sendEmail(lead)} className="p-1.5 bg-blue-100 text-blue-700 rounded"><Mail size={14} /></button>{lead.phone?.startsWith('260') && <button onClick={() => makeCall(lead)} className="p-1.5 bg-yellow-100 text-yellow-700 rounded"><Phone size={14} /></button>}</div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && <div className="flex justify-between items-center mt-4"><button onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="px-3 py-1 border rounded-lg">Previous</button><span className="text-gray-600">Page {currentPage} of {totalPages}</span><button onClick={() => setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="px-3 py-1 border rounded-lg">Next</button></div>}
                </div>
              </div>
            )}

            {/* TEMPLATE LIBRARY */}
            {activeSection === 'templates' && recruiter && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <TemplateLibrary recruiterId={recruiter.user_id} />
              </div>
            )}

            {/* BULK MESSAGING */}
            {activeSection === 'bulk-messaging' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <div className="space-y-6">
                  <div className="flex items-center gap-4"><input type="checkbox" checked={selectedLeads.size === paginatedLeads.length} onChange={(e) => setSelectedLeads(e.target.checked ? new Set(paginatedLeads.map(l=>l.id).filter(id=>id)) : new Set())} className="w-4 h-4 text-blue-600 rounded" /><span className="font-medium text-gray-800">Select All ({paginatedLeads.length} leads)</span></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Message Template</label><select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg"><option value="default">AI Suggested Follow-up</option><option value="warm_followup">Warm Follow-up</option><option value="program_highlight">Program Highlights</option><option value="checklist">Document Checklist</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-2">Custom Message (Optional)</label><textarea placeholder="Add custom message..." className="w-full px-3 py-2 border rounded-lg h-24" /></div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200"><h4 className="font-medium text-blue-800 mb-2">Preview</h4><p className="text-blue-700 text-sm">{formatTemplateMessage(selectedTemplate, { name: 'John Doe', program: 'Computer Science', institution: 'University of Africa' })}</p></div>
                  <button onClick={async () => { if(selectedLeads.size===0) return alert('Select leads'); setBulkActionLoading(true); try { for(const lead of paginatedLeads.filter(l=>l.id && selectedLeads.has(l.id))) await sendWhatsApp(lead); alert(`Sent to ${selectedLeads.size} leads`); setSelectedLeads(new Set()); } catch(e){ alert('Failed'); } finally { setBulkActionLoading(false); } }} disabled={bulkActionLoading || selectedLeads.size===0} className="px-6 py-3 bg-green-600 text-white rounded-xl flex items-center gap-2">{bulkActionLoading ? <Loader2 size={18} className="animate-spin"/> : <MessageCircle size={18}/>} Send WhatsApp ({selectedLeads.size})</button>
                </div>
              </div>
            )}

            {/* SHARING */}
            {activeSection === 'sharing' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">📤 Share Leads</h3><div className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-2">Select Leads to Share</label><div className="max-h-48 overflow-y-auto border rounded-lg p-3">{paginatedLeads.slice(0,5).map(lead=><div key={lead.id} className="flex items-center gap-2 py-1"><input type="checkbox" className="w-4 h-4"/><span className="text-sm text-gray-700">{lead.name}</span></div>)}</div></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Share with Recruiter</label><select className="w-full px-3 py-2 border rounded-lg"><option>Select recruiter...</option><option>Jane Smith</option><option>Mike Johnson</option></select></div><button className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl">Share Selected Leads</button></div></div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">📥 Shared with Me</h3><div className="space-y-3"><div className="p-4 bg-green-50 rounded-xl border"><div className="flex justify-between"><div><p className="font-medium text-green-800">5 leads from Jane Smith</p><p className="text-sm text-green-700">Engineering program leads</p></div><span className="text-xs text-green-600">2h ago</span></div></div><div className="p-4 bg-blue-50 rounded-xl border"><div className="flex justify-between"><div><p className="font-medium text-blue-800">3 leads from Mike Johnson</p><p className="text-sm text-blue-700">Business program leads</p></div><span className="text-xs text-blue-600">1d ago</span></div></div></div></div>
              </div>
            )}

            {/* REPORTS */}
            {activeSection === 'reports' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">Performance Overview</h3><div className="text-gray-700">Monthly performance charts have been replaced with AI narrative analytics. Please check the Dashboard tab for insights.</div></div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">Quick Reports</h3><div className="space-y-3"><button className="w-full p-3 bg-blue-50 rounded-xl text-left"><div className="font-medium text-blue-800">Monthly Performance</div><div className="text-sm text-blue-700">Generate monthly report</div></button><button className="w-full p-3 bg-green-50 rounded-xl text-left"><div className="font-medium text-green-800">Lead Conversion</div><div className="text-sm text-green-700">Conversion analytics</div></button></div></div>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl p-6 text-white"><div className="flex justify-between"><div><h3 className="text-xl font-bold">💰 Commission Summary</h3><p className="text-green-100">Your earnings overview</p></div><div className="text-right"><p className="text-3xl font-bold">{formatCurrency((stats.pendingCommissions || 0) + (stats.paidCommissions || 0))}</p><p className="text-sm text-green-100">Total Earned</p></div></div></div>
              </div>
            )}

            {/* CLAIMS */}
            {activeSection === 'claims' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">💵 Pending Claims</h3>{commissions.filter(c => c.status === 'pending').length === 0 ? <p className="text-gray-500">No pending commissions.</p> : commissions.filter(c => c.status === 'pending').map((c) => (<div key={c.id} className="p-4 bg-yellow-50 rounded-xl border mb-3"><div className="flex justify-between"><div><span className="font-medium text-yellow-800">Claim #{c.id?.slice(0,6)}</span><p className="text-sm text-yellow-700">Lead: {c.student_id || 'N/A'}</p></div><span className="text-lg font-bold text-gray-900">{formatCurrency(c.amount || 0)}</span></div><button onClick={() => markCommissionPaid(c.id)} disabled={markingCommissionId === c.id} className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg">Mark Paid</button></div>))}</div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">✅ Claimed Commissions</h3>{commissions.filter(c => c.status === 'paid').length === 0 ? <p className="text-gray-500">No paid commissions yet.</p> : commissions.filter(c => c.status === 'paid').map((c) => (<div key={c.id} className="p-4 bg-green-50 rounded-xl border mb-3"><div className="flex justify-between"><div><p className="font-medium text-green-800">Claim #{c.id?.slice(0,6)}</p><p className="text-sm text-green-700">Lead: {c.student_id || 'N/A'}</p></div><span className="text-lg font-bold text-gray-900">{formatCurrency(c.amount || 0)}</span></div><span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Paid</span></div>))}</div>
              </div>
            )}

            {/* AI ASSISTANT */}
            {activeSection === 'ai-assistant' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">💡 AI Insights</h3><div className="space-y-4"><div className="p-4 bg-blue-50 rounded-xl"><h4 className="font-medium text-blue-800">🎯 Lead Quality Analysis</h4><p className="text-sm text-blue-700">Your leads have a 78% conversion potential. Focus on high-priority leads in the next 24 hours.</p></div><div className="p-4 bg-green-50 rounded-xl"><h4 className="font-medium text-green-800">📈 Performance Prediction</h4><p className="text-sm text-green-700">Based on trends, you could convert 12 more leads this month.</p></div></div></div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">🤖 Ask AI Assistant</h3><div className="bg-gray-50 rounded-xl p-4"><p className="text-sm text-gray-600 mb-2">How can I improve my conversion rate?</p><div className="bg-white rounded-lg p-3 border"><p className="text-sm text-gray-800">Focus on personalized follow-ups within 24 hours.</p></div></div><input type="text" placeholder="Ask me anything..." className="w-full mt-4 px-4 py-3 border rounded-xl" /></div>
              </div>
            )}

            {/* SETTINGS */}
            {activeSection === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">👤 Profile Settings</h3><div className="space-y-4"><input type="text" defaultValue={recruiter?.name} className="w-full p-2 border rounded-lg"/><input type="email" defaultValue={recruiter?.email} className="w-full p-2 border rounded-lg"/><button className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl">Update Profile</button></div></div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border"><h3 className="text-xl font-bold mb-4 text-gray-800">🔔 Notification Preferences</h3><div className="space-y-3"><div className="flex justify-between text-gray-700"><span>Email notifications</span><input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600"/></div><div className="flex justify-between text-gray-700"><span>WhatsApp notifications</span><input type="checkbox" defaultChecked/></div></div></div>
              </div>
            )}
          </div>
        </main>
      </div>

      <FileUploadModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onLeadsExtracted={handleLeadsExtracted}
        institutions={institutions}
        selectedInstitution={selectedInstitution}
        onInstitutionChange={setSelectedInstitution}
        recruiter={recruiter}
      />
    </div>
  );
}