'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Copy, Share2, DollarSign, Users, MousePointerClick,
  RefreshCw, CheckCircle, Clock, AlertCircle, Trophy, Award,
  Loader2, Mail, Phone, Sparkles, TrendingUp, Upload, FileText,
  Brain, Target, Star, Zap, Calendar, Menu, X, LayoutDashboard,
  UserPlus, MessageCircle, Filter, ChevronDown, ChevronUp, Search, Settings, LogOut
} from 'lucide-react';
import { FaFacebook, FaTwitter, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { format, subDays } from 'date-fns';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// ============================================================================
// Helper Functions (white theme adjustments)
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

// ============================================================================
// Offline Queue (unchanged)
// ============================================================================
class OfflineQueue {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'affiliate_offline';
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
// File Upload Modal (white theme, supports all file types)
// ============================================================================
function FileUploadModal({ isOpen, onClose, onLeadsExtracted, institutions, selectedInstitution, onInstitutionChange }: any) {
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
    const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 200);
    try {
      const res = await fetch('/api/extract-leads', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.leads) {
        await onLeadsExtracted(data.leads);
        onClose();
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
            <input type="file" accept=".csv,.xlsx,.xls,.pdf,.docx,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} ref={fileInputRef} className="hidden" id="import-file" />
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
// Sidebar Component (white theme)
// ============================================================================
function Sidebar({ affiliate, sidebarOpen, activeSection, onToggleSidebar, onSectionChange, onLogout }: any) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quick-admission', label: 'Quick Admission', icon: FileText },
    { id: 'leads', label: 'My Leads', icon: Users },
    { id: 'referrals', label: 'Referrals', icon: Share2 },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'points', label: 'Rewards', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-white shadow-xl border-r`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-bold text-gray-800">Affiliate Portal</span>
        </div>
        <button onClick={() => onToggleSidebar(false)} className="lg:hidden text-gray-500"><X size={20} /></button>
      </div>
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <p className="text-sm text-gray-500">Welcome,</p>
        <p className="font-semibold text-gray-800">{affiliate?.full_name || affiliate?.name || 'Affiliate'}</p>
        <p className="text-xs text-gray-500">{affiliate?.email}</p>
      </div>
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
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

// ============================================================================
// Main Component
// ============================================================================
export default function AffiliateDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalConversions: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    conversionRate: 0,
    points: 0,
    level: 1,
    badges: [] as string[],
    totalLeads: 0,
    convertedLeads: 0,
  });
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [pointTransactions, setPointTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shortCode, setShortCode] = useState('');
  const [shortLink, setShortLink] = useState('');
  const [whatsappStatus, setWhatsappStatus] = useState('');
  const [adCopy, setAdCopy] = useState({ headline: '', description: '' });
  const [generating, setGenerating] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showAchievement, setShowAchievement] = useState<{ message: string; points: number } | null>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);

  // ---------- Offline sync ----------
  useEffect(() => {
    const handleOnline = () => { setOnline(true); syncOfflineEvents(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    offlineQueue.init().then(() => syncOfflineEvents());
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineEvents = async () => {
    const events = await offlineQueue.getEvents();
    if (events.length === 0) return;
    for (const event of events) {
      try {
        if (event.type === 'click') {
          await supabase.from('affiliate_clicks').insert({
            affiliate_id: user?.id,
            clicked_at: event.timestamp,
            referrer_url: event.url,
          });
          await addPoints('click', 10);
        } else if (event.type === 'share') {
          await addPoints('share', 50);
        }
      } catch (err) { console.error('Sync failed', err); }
    }
    await offlineQueue.clearEvents();
    loadAffiliateData();
  };

  // ---------- Points & Gamification ----------
  const addPoints = async (reason: string, points: number) => {
    if (!user) return;
    const { error: updateError } = await supabase.rpc('increment_affiliate_points', { user_id: user.id, points_added: points });
    if (updateError) console.error('Points update failed', updateError);
    await supabase.from('affiliate_point_transactions').insert({ user_id: user.id, points, reason });
    setShowAchievement({ message: reason, points });
    setTimeout(() => setShowAchievement(null), 3000);
    loadAffiliateData();
  };

  const dailyCheckIn = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('affiliate_points')
      .select('daily_checkin_last')
      .eq('user_id', user?.id)
      .single();
    if (existing?.daily_checkin_last === today) {
      alert('You already checked in today!');
      return;
    }
    await supabase
      .from('affiliate_points')
      .update({ daily_checkin_last: today })
      .eq('user_id', user?.id);
    await addPoints('Daily check-in', 10);
  };

  // ---------- AI Lead Analysis ----------
  const analyzeLead = (lead: any) => {
    let score = 50;
    if (lead.email) score += 10;
    if (lead.phone) score += 15;
    if (lead.notes && lead.notes.length > 20) score += 10;
    let intent = 'seeking_info';
    let priority = 'medium';
    if (score > 70) { intent = 'ready_to_apply'; priority = 'high'; }
    else if (score > 50) { intent = 'price_sensitive'; priority = 'medium'; }
    else { priority = 'low'; }
    return { score, intent, priority };
  };

  // ---------- Load Data ----------
  const loadAffiliateData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setAffiliate(profile);

      const { data: instData } = await supabase
        .from('institutions')
        .select('id, institution_name');
      setInstitutions(instData || []);

      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_affiliate', user.id)
        .order(sortBy === 'date' ? 'created_at' : 'lead_score', { ascending: sortOrder === 'asc' });
      
      const analyzedLeads = (leadsData || []).map(lead => {
        if (!lead.lead_score) {
          const analysis = analyzeLead(lead);
          supabase.from('leads').update({
            lead_score: analysis.score,
            intent: analysis.intent,
            priority: analysis.priority,
          }).eq('id', lead.id).then();
          return { ...lead, ...analysis };
        }
        return lead;
      });
      setLeads(analyzedLeads);

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { count: clicks } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', user.id)
        .gte('clicked_at', thirtyDaysAgo);

      const { data: earnings } = await supabase
        .from('affiliate_earnings')
        .select('*')
        .eq('affiliate_id', user.id)
        .order('created_at', { ascending: false });

      const totalEarnings = earnings?.reduce((s, e) => s + e.amount, 0) || 0;
      const pending = earnings?.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0) || 0;
      const paid = earnings?.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0) || 0;
      const conversions = earnings?.length || 0;
      const conversionRate = clicks ? (conversions / clicks) * 100 : 0;

      const { data: pointsData } = await supabase
  .from('affiliate_points')
  .select('points, level, badges')
  .eq('user_id', user.id)
  .maybeSingle();
      const points = pointsData?.points || 0;
      const level = pointsData?.level || 1;
      const badges = pointsData?.badges || [];

      const { data: transactions } = await supabase
        .from('affiliate_point_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const totalLeads = analyzedLeads.length;
      const convertedLeads = analyzedLeads.filter(l => l.status === 'converted').length;

      setStats({
        totalClicks: clicks || 0,
        totalConversions: conversions,
        totalEarnings,
        pendingEarnings: pending,
        paidEarnings: paid,
        conversionRate,
        points,
        level,
        badges,
        totalLeads,
        convertedLeads,
      });
      setEarningsHistory(earnings || []);
      setPointTransactions(transactions || []);

      const { data: existingShort } = await supabase
        .from('affiliate_short_links')
        .select('short_code')
        .eq('affiliate_id', user.id)
        .single();
      if (existingShort) {
        setShortCode(existingShort.short_code);
        setShortLink(`${window.location.origin}/r/a/${existingShort.short_code}`);
      } else {
        const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'AFF';
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${initials}${random}`;
        const longUrl = `${window.location.origin}/affiliate/refer/${user.id}`;
        await supabase.from('affiliate_short_links').insert({ affiliate_id: user.id, short_code: code, long_url: longUrl });
        setShortCode(code);
        setShortLink(`${window.location.origin}/r/a/${code}`);
      }

      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = d.toISOString().split('T')[0].substring(0, 7);
        const monthName = d.toLocaleString('default', { month: 'short' });
        const leadsInMonth = analyzedLeads.filter(l => l.created_at?.startsWith(monthStr)).length;
        const convertedInMonth = analyzedLeads.filter(l => l.status === 'converted' && l.created_at?.startsWith(monthStr)).length;
        months.push({ month: monthName, leads: leadsInMonth, converted: convertedInMonth });
      }
      setMonthlyData(months);

      const countryMap = new Map<string, number>();
      analyzedLeads.forEach(l => { const c = l.country || 'Unknown'; countryMap.set(c, (countryMap.get(c) || 0) + 1); });
      setCountryData(Array.from(countryMap.entries()).map(([name, value]) => ({ name, value })));

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [router, sortBy, sortOrder]);

  useEffect(() => {
    loadAffiliateData();
  }, [loadAffiliateData]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('affiliate-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_earnings', filter: `affiliate_id=eq.${user.id}` }, () => loadAffiliateData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_clicks', filter: `affiliate_id=eq.${user.id}` }, () => loadAffiliateData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_points', filter: `user_id=eq.${user.id}` }, () => loadAffiliateData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads', filter: `assigned_affiliate=eq.${user.id}` }, () => loadAffiliateData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadAffiliateData]);

  // ---------- Lead Actions ----------
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    await supabase
      .from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    if (newStatus === 'converted') {
      await addPoints('Lead converted', 50);
    }
    loadAffiliateData();
  };

  const sendWhatsApp = async (lead: any) => {
    const phone = lead.phone?.replace(/\D/g, '');
    if (!phone) return;
    const message = `Hello ${lead.name},\n\nI'm following up on your interest. Let me know if you have any questions.\n\nBest regards,\n${affiliate?.full_name || 'Affiliate'}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    if (lead.status === 'new') await updateLeadStatus(lead.id, 'contacted');
  };

  const sendEmail = (lead: any) => {
    const subject = 'Application Follow-up';
    const body = `Hello ${lead.name},\n\nI'm following up on your interest. Please let me know if you need assistance.\n\nBest regards,\n${affiliate?.full_name || 'Affiliate'}`;
    window.location.href = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (lead.status === 'new') updateLeadStatus(lead.id, 'contacted');
  };

  const handleLeadsExtracted = async (extractedLeads: any[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: extractedLeads,
          institution_id: selectedInstitution || null,
          assigned_affiliate: user?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ingest failed');
      setImportModalOpen(false);
      setSelectedInstitution('');
      loadAffiliateData();
    } catch (err: any) {
      alert(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Referral Helpers ----------
  const copyShortLink = () => {
    navigator.clipboard.writeText(shortLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (online) {
      supabase.from('affiliate_clicks').insert({ affiliate_id: user?.id, clicked_at: new Date().toISOString(), referrer_url: 'copy_share' });
      addPoints('click', 10);
    } else {
      offlineQueue.addEvent({ type: 'click', url: 'copy_share', timestamp: new Date().toISOString() });
    }
  };

  const shareLink = async (platform: string) => {
    const text = `Join me on our platform and earn commissions! Use my link: ${shortLink}`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shortLink)}`,
      email: `mailto:?subject=Join our platform&body=${encodeURIComponent(text)}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
    if (online) await addPoints('share', 50);
    else await offlineQueue.addEvent({ type: 'share', timestamp: new Date().toISOString() });
  };

  const generateStatus = () => {
    setGenerating(true);
    setTimeout(() => {
      const templates = [
        "🎓 Just earned points on our platform! Use my referral link to get rewards when you sign up.",
        "🚀 Unlock your future with our platform. Click my link and start earning points!",
        "✨ Refer a friend and get bonus points! Limited time offer.",
      ];
      setWhatsappStatus(templates[Math.floor(Math.random() * templates.length)]);
      setGenerating(false);
    }, 500);
  };

  const generateAd = () => {
    setGenerating(true);
    setTimeout(() => {
      setAdCopy({
        headline: "Start Earning with Our Affiliate Program!",
        description: "Join today and earn commissions for every successful referral. Limited time bonus available!",
      });
      setGenerating(false);
    }, 500);
  };

  const filteredLeads = leads.filter(lead => {
    if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
    if (filterPriority !== 'all' && lead.priority !== filterPriority) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return lead.name?.toLowerCase().includes(term) || lead.email?.toLowerCase().includes(term);
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      return sortOrder === 'asc' ? (a.lead_score || 0) - (b.lead_score || 0) : (b.lead_score || 0) - (a.lead_score || 0);
    }
  });
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatCurrencyLocal = (value: number) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(value);
  const levelProgress = stats.level ? ((stats.points % 500) / 500) * 100 : 0;

  if (loading && !stats.totalClicks && leads.length === 0) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

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
        affiliate={affiliate}
        sidebarOpen={sidebarOpen}
        activeSection={activeSection}
        onToggleSidebar={setSidebarOpen}
        onSectionChange={setActiveSection}
        onLogout={async () => { await supabase.auth.signOut(); router.push('/login'); }}
      />

      <div className="lg:ml-72 min-h-screen">
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {activeSection === 'dashboard' ? 'Affiliate Dashboard' :
                   activeSection === 'leads' ? 'My Leads' :
                   activeSection === 'referrals' ? 'Referral Performance' :
                   activeSection === 'analytics' ? 'Analytics' :
                   activeSection === 'points' ? 'Rewards & Gamification' : 'Settings'}
                </h1>
                <p className="text-gray-500 text-sm">Track referrals, leads, and commissions</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={dailyCheckIn} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-green-200">
                  <Calendar size={14} /> Daily Check-in
                </button>
                <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-yellow-200">
                  <Star size={14} /> {stats.points} pts (Lv.{stats.level})
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${online ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {online ? '● Online' : '● Offline'}
                </div>
              </div>
            </div>

            {/* Level Progress Bar */}
            {activeSection !== 'leads' && (
              <div className="mb-6 bg-white rounded-xl p-4 shadow-sm border">
                <div className="flex justify-between text-sm mb-1 text-gray-600">
                  <span>Level {stats.level} Progress</span>
                  <span>{stats.points % 500}/500 XP</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500" style={{ width: `${levelProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Dashboard Section */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex justify-between"><div><p className="text-gray-500 text-sm">Total Clicks</p><p className="text-3xl font-bold text-gray-900">{stats.totalClicks}</p></div><MousePointerClick size={32} className="opacity-80 text-blue-500" /></div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex justify-between"><div><p className="text-gray-500 text-sm">Conversions</p><p className="text-3xl font-bold text-gray-900">{stats.totalConversions}</p></div><Users size={32} className="opacity-80 text-green-500" /></div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex justify-between"><div><p className="text-gray-500 text-sm">Pending Earnings</p><p className="text-3xl font-bold text-gray-900">{formatCurrencyLocal(stats.pendingEarnings)}</p></div><DollarSign size={32} className="opacity-80 text-yellow-500" /></div>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex justify-between"><div><p className="text-gray-500 text-sm">Reward Points</p><p className="text-3xl font-bold text-gray-900">{stats.points}</p></div><Award size={32} className="opacity-80 text-purple-500" /></div>
                  </div>
                </div>

                {/* Referral Link Card */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><Share2 className="text-blue-600" /> Your Referral Link</h2>
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
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Monthly Performance</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }} />
                        <Legend />
                        <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={3} />
                        <Line type="monotone" dataKey="converted" stroke="#10b981" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Lead Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={countryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                          {countryData.map((_, i) => <Cell key={i} fill={['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'][i%5]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Content Generators */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800"><Sparkles className="w-5 h-5 text-yellow-500" /> WhatsApp Status Generator</h2>
                    <button onClick={generateStatus} disabled={generating} className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Generate Status</button>
                    {whatsappStatus && <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">{whatsappStatus}</div>}
                  </div>
                  <div className="bg-white rounded-2xl border p-6 shadow-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800"><Sparkles className="w-5 h-5 text-yellow-500" /> Social Media Ad Generator</h2>
                    <button onClick={generateAd} disabled={generating} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Generate Ad Copy</button>
                    {adCopy.headline && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="font-bold text-blue-600">{adCopy.headline}</p>
                        <p className="text-sm mt-1 text-gray-700">{adCopy.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Leads Section (with import button) */}
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
                      <button onClick={loadAffiliateData} className="p-2 border rounded-lg"><RefreshCw size={18} /></button>
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
                            <td className="px-4 py-4 text-center"><span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">{lead.lead_score || 0}</span></td>
                            <td className="px-4 py-4"><span className="flex items-center gap-1 text-sm text-gray-700 capitalize">{getIntentIcon(lead.intent)}{lead.intent?.replace(/_/g, ' ')}</span></td>
                            <td className="px-4 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(lead.priority)}`}>{lead.priority || 'medium'}</span></td>
                            <td className="px-4 py-4"><select value={lead.status || 'new'} onChange={(e) => updateLeadStatus(lead.id, e.target.value)} className={`text-xs border rounded px-2 py-1 bg-white ${getStatusBadge(lead.status)}`}><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option><option value="converted">Converted</option><option value="lost">Lost</option></select></td>
                            <td className="px-4 py-4"><div className="flex gap-1"><button onClick={() => sendWhatsApp(lead)} className="p-1.5 bg-green-100 text-green-700 rounded"><MessageCircle size={14} /></button><button onClick={() => sendEmail(lead)} className="p-1.5 bg-blue-100 text-blue-700 rounded"><Mail size={14} /></button></div></td>
                          </tr>
                        ))}
                        {paginatedLeads.length === 0 && (
                          <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No leads yet. Import leads to get started.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && <div className="flex justify-between items-center mt-4"><button onClick={() => setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="px-3 py-1 border rounded-lg">Previous</button><span className="text-gray-600">Page {currentPage} of {totalPages}</span><button onClick={() => setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="px-3 py-1 border rounded-lg">Next</button></div>}
                </div>
              </div>
            )}

            {/* Referrals Section */}
            {activeSection === 'referrals' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h2 className="text-xl font-bold mb-4 text-gray-800">Referral Performance</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-blue-600">{stats.totalClicks}</p><p className="text-sm text-gray-500">Total Clicks</p></div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-green-600">{stats.totalConversions}</p><p className="text-sm text-gray-500">Conversions</p></div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl"><p className="text-2xl font-bold text-yellow-600">{stats.conversionRate.toFixed(1)}%</p><p className="text-sm text-gray-500">Conversion Rate</p></div>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-blue-700 text-sm">💡 Tip: Share your link on social media daily to increase clicks. You earn 10 points per click and 50 points per conversion!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Section */}
            {activeSection === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Monthly Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }} />
                        <Legend />
                        <Line type="monotone" dataKey="leads" stroke="#3b82f6" />
                        <Line type="monotone" dataKey="converted" stroke="#10b981" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white rounded-2xl p-6 shadow-sm border">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Lead Sources</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={countryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                          {countryData.map((_, i) => <Cell key={i} fill={['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'][i%5]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Earnings Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div><p className="text-2xl font-bold text-green-600">{formatCurrencyLocal(stats.totalEarnings)}</p><p className="text-xs text-gray-500">Total Earned</p></div>
                    <div><p className="text-2xl font-bold text-yellow-600">{formatCurrencyLocal(stats.pendingEarnings)}</p><p className="text-xs text-gray-500">Pending</p></div>
                    <div><p className="text-2xl font-bold text-blue-600">{formatCurrencyLocal(stats.paidEarnings)}</p><p className="text-xs text-gray-500">Paid</p></div>
                    <div><p className="text-2xl font-bold text-purple-600">{stats.totalConversions}</p><p className="text-xs text-gray-500">Conversions</p></div>
                  </div>
                </div>
              </div>
            )}

            {/* Points & Rewards Section */}
            {activeSection === 'points' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Rewards & Gamification</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p><strong className="text-gray-800">Total Points:</strong> <span className="text-blue-600">{stats.points}</span></p>
                    <p><strong className="text-gray-800">Level:</strong> {stats.level}</p>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-full" style={{ width: `${levelProgress}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{stats.points % 500}/500 to next level</p>
                    </div>
                    <button onClick={dailyCheckIn} className="mt-4 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg border border-yellow-200">Daily Check-in (+10)</button>
                    {stats.badges.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold text-gray-800 mb-2">Your Badges</h3>
                        <div className="flex flex-wrap gap-2">
                          {stats.badges.map((badge, i) => <span key={i} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm border border-purple-200">{badge}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Ways to Earn Points</h3>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>✓ Daily check-in – 10 pts</li>
                      <li>✓ Referral click – 10 pts</li>
                      <li>✓ Social share – 50 pts</li>
                      <li>✓ Lead converted – 50 pts</li>
                      <li>✓ Successful referral signup – 100 pts</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6 overflow-x-auto">
                  <h3 className="font-semibold text-gray-800 mb-3">Point Transactions</h3>
                  <table className="w-full">
                    <thead className="border-b"><tr><th className="text-left py-2 text-gray-500">Date</th><th className="text-left text-gray-500">Action</th><th className="text-right text-gray-500">Points</th></tr></thead>
                    <tbody>
                      {pointTransactions.map(tx => (
                        <tr key={tx.id}><td className="py-2 text-sm">{format(new Date(tx.created_at), 'dd MMM yyyy')}</td><td className="capitalize text-sm">{tx.reason}</td><td className="text-right text-blue-600">+{tx.points}</td></tr>
                      ))}
                      {pointTransactions.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-gray-500">No transactions yet</td></tr>}
                    </tbody>
                  </table>
                </div>
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
      />
    </div>
  );
}