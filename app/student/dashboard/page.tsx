'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { 
  Home, BookOpen, Calendar as CalendarIcon, FileText, Library, Bot, MessageCircle, Users, User,
  Bell, Search, Mic, Sparkles, ChevronRight, Star, Gift, Award, Zap, Flame, Target,
  Copy, Share2, MousePointerClick, Upload, CreditCard, CheckCircle, Clock, AlertCircle, Loader2,
  Menu, X, TrendingUp, Cloud, CloudRain, Sun, Moon, Eye, Camera, MapPin, Phone, CornerDownLeft,
  IdCard, GraduationCap, FileCheck, Building2, DollarSign, MessageSquare, Send
} from 'lucide-react';
import { FaFacebook, FaTwitter, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import toast from 'react-hot-toast';

// -------------------- Offline Queue (unchanged) --------------------
class OfflineQueue {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'app_offline';
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

// -------------------- AI Helper Functions --------------------
const generateAIAdvisorMessage = (name: string, points: number, level: number): string => {
  const messages = [
    `Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${name}. Your AI advisor has prepared your optimal learning path today.`,
    `Welcome back, ${name}! You're only ${500 - (points % 500)} points away from level ${level + 1}. Keep going!`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

// -------------------- Helper Functions --------------------
const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(val || 0);
const formatDate = (date: string) => new Date(date).toLocaleDateString();

// -------------------- Role Detection --------------------
type UserRole = 'student' | 'recruiter' | 'affiliate' | 'institution_admin' | 'consultancy_admin';

async function getUserRole(): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role || null;
}

async function getAccessibleInstitutionIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase.from('profiles').select('role, institution_id, consultancy_id').eq('id', user.id).single();
  if (!profile) return [];
  if (profile.role === 'student' && profile.institution_id) return [profile.institution_id];
  if (profile.role === 'institution_admin' && profile.institution_id) return [profile.institution_id];
  if (profile.role === 'consultancy_admin' && profile.consultancy_id) {
    const { data: links } = await supabase.from('consultancy_institutions').select('institution_id').eq('consultancy_id', profile.consultancy_id);
    return links?.map(l => l.institution_id) || [];
  }
  if (profile.role === 'recruiter') {
    const { data: recruiter } = await supabase.from('recruiters').select('institution_id').eq('user_id', user.id).single();
    return recruiter?.institution_id ? [recruiter.institution_id] : [];
  }
  return [];
}

// -------------------- Main Component --------------------
export default function UniversalDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [aiChatMessage, setAiChatMessage] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showAchievement, setShowAchievement] = useState<{ message: string; points: number } | null>(null);
  
  // Role‑specific data
  const [programs, setPrograms] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, revenue: 0 });
  
  // Student‑specific (if applicable)
  const [application, setApplication] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [points, setPoints] = useState({ points: 0, level: 1, badges: [] as string[] });
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [documentType, setDocumentType] = useState<'id' | 'transcript' | 'certificate'>('id');
  const [programsLoading, setProgramsLoading] = useState(false);
  
  // Referral (for students/affiliates)
  const [shortLink, setShortLink] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState({ clicks: 0, conversions: 0, pointsFromReferrals: 0 });
  const [whatsappStatus, setWhatsappStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  
  // Sample static data for timeline, deadlines, recommendations
  const timeline = [ /* same as before */ ];
  const deadlines = [ /* same as before */ ];
  const recommendations = [ /* same as before */ ];

  // ---------- Utility Functions ----------
  const addPoints = async (reason: string, pts: number) => {
    if (!user || role !== 'student') return;
    await supabase.rpc('increment_student_points', { student_id: user.id, points_added: pts });
    await supabase.from('point_transactions').insert({ student_id: user.id, points: pts, reason });
    setShowAchievement({ message: reason, points: pts });
    setTimeout(() => setShowAchievement(null), 3000);
    loadData();
  };

  const dailyCheckIn = async () => {
    if (role !== 'student') return;
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase.from('student_points').select('daily_checkin_last').eq('student_id', user.id).single();
    if (existing?.daily_checkin_last === today) { alert('Already checked in'); return; }
    await supabase.from('student_points').update({ daily_checkin_last: today }).eq('student_id', user.id);
    await addPoints('Daily check-in', 10);
  };

  // ---------- Data Loading (Role‑aware) ----------
  const loadPrograms = async () => {
    setProgramsLoading(true);
    const instIds = await getAccessibleInstitutionIds();
    let query = supabase.from('programs').select('id, program_name, fee_structure, duration, is_active');
    if (instIds.length) query = query.in('institution_id', instIds);
    const { data } = await query;
    const transformed = (data || [])
  .filter(p => p !== null && typeof p === 'object')
  .map((p: any) => ({ ...p, title: p.program_name, status: p.is_active, fee: p.fee_structure?.total || 0 }));
    setPrograms(transformed);
    setProgramsLoading(false);
  };

  const loadApplications = async () => {
    const instIds = await getAccessibleInstitutionIds();
    let query = supabase.from('institution_applications').select('*, leads(name, email), institution_programs(program_name)');
    if (role === 'student') query = query.eq('lead_id', user.id);
    else if (role === 'institution_admin' && instIds.length) query = query.in('institution_id', instIds);
    else if (role === 'consultancy_admin') query = query.in('institution_id', instIds);
    else if (role === 'recruiter') {
      const { data: leads } = await supabase.from('leads').select('id').eq('assigned_recruiter', user.id);
      const leadIds = leads?.map(l => l.id) || [];
      if (leadIds.length) query = query.in('lead_id', leadIds);
      else query = query.eq('lead_id', '00000000-0000-0000-0000-000000000000'); // empty
    }
    const { data } = await query;
    setApplications(data || []);
  };

  const loadPayments = async () => {
    const instIds = await getAccessibleInstitutionIds();
    let query = supabase.from('payments').select('*, leads(name)');
    if (role === 'student') query = query.eq('student_id', user.id);
    else if (role === 'institution_admin' && instIds.length) {
      const { data: progs } = await supabase.from('programs').select('id').in('institution_id', instIds);
      const progIds = progs?.map(p => p.id) || [];
      if (progIds.length) query = query.in('program_id', progIds);
      else query = query.eq('program_id', '00000000-0000-0000-0000-000000000000');
    }
    const { data } = await query;
    setPayments(data || []);
  };

  const loadCommissions = async () => {
    if (role === 'recruiter') {
      const { data } = await supabase.from('commissions').select('*').eq('recruiter_id', user.id);
      setCommissions(data || []);
    } else if (role === 'affiliate') {
      const { data: aff } = await supabase.from('affiliates').select('id').eq('user_id', user.id).single();
      if (aff) {
        const { data } = await supabase.from('commissions').select('*').eq('affiliate_id', aff.id);
        setCommissions(data || []);
      }
    } else setCommissions([]);
  };

  const loadStudentSpecificData = async () => {
    if (role !== 'student') return;
    // Application
    const { data: app } = await supabase.from('applications').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1).single();
    setApplication(app);
    // Documents
    const { data: docs } = await supabase.from('student_documents').select('*').eq('student_id', user.id);
    setDocuments(docs || []);
    // Enrollments
    const { data: enrolls } = await supabase.from('enrollments').select('*, program:program_id(*)').eq('student_id', user.id);
    setEnrollments(enrolls || []);
    // Points
    const { data: ptsData } = await supabase.from('student_points').select('points, level, badges').eq('student_id', user.id).single();
    if (ptsData) setPoints({ points: ptsData.points || 0, level: ptsData.level || 1, badges: ptsData.badges || [] });
    // Referral stats
    const { count: clicks } = await supabase.from('student_referral_clicks').select('*', { count: 'exact', head: true }).eq('student_id', user.id);
    const { data: referrals } = await supabase.from('referrals').select('points_awarded').eq('referrer_id', user.id);
    setReferralStats({ clicks: clicks || 0, conversions: referrals?.length || 0, pointsFromReferrals: referrals?.reduce((s, r) => s + (r.points_awarded || 0), 0) || 0 });
    // Short link
    const { data: existingShort } = await supabase.from('student_short_links').select('short_code').eq('student_id', user.id).single();
    if (existingShort) {
      setShortCode(existingShort.short_code);
      setShortLink(`${window.location.origin}/r/s/${existingShort.short_code}`);
    } else {
      const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'STU';
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${initials}${random}`;
      await supabase.from('student_short_links').insert({ student_id: user.id, short_code: code, long_url: `${window.location.origin}/student/refer/${user.id}` });
      setShortCode(code);
      setShortLink(`${window.location.origin}/r/s/${code}`);
    }
  };

  const loadStats = () => {
    const total = applications.length;
    const pending = applications.filter(a => a.application_status === 'pending_review').length;
    const approved = applications.filter(a => a.application_status === 'approved').length;
    const revenue = payments.reduce((s, p) => s + p.amount, 0);
    setStats({ total, pending, approved, revenue });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);
    const userRole = await getUserRole();
    setRole(userRole);
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);
    
    await loadPrograms();
    await loadApplications();
    await loadPayments();
    await loadCommissions();
    await loadStudentSpecificData();
    loadStats();
    
    // Load notifications
    const { data: notifs } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    setNotifications(notifs || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('universal-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'institution_applications' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ---------- Action Handlers (Student-specific) ----------
  const createApplication = async () => {
    if (role !== 'student') return;
    const selectedProgram = programs.find(p => p.id === selectedProgramId);
    if (!selectedProgram) return;
    const { data, error } = await supabase.from('applications').insert({
      student_id: user.id, program_id: selectedProgramId, total_fees: selectedProgram.fee,
      status: 'draft', payment_status: 'pending'
    }).select().single();
    if (error) toast.error('Failed to create application');
    else { setApplication(data); await addPoints('Application started', 10); loadData(); }
  };

  const submitApplication = async () => {
    if (!application) return;
    setSubmittingApp(true);
    const requiredDocs = ['id', 'transcript'];
    const uploadedTypes = documents.map(d => d.document_type);
    const missing = requiredDocs.filter(t => !uploadedTypes.includes(t));
    if (missing.length) { alert(`Missing documents: ${missing.join(', ')}`); setSubmittingApp(false); return; }
    const { error } = await supabase.from('applications').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', application.id);
    if (!error) { await addPoints('Application submitted', 50); alert('Application submitted!'); loadData(); }
    else alert('Failed to submit');
    setSubmittingApp(false);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !application) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${application.id}/${documentType}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('student-docs').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('student-docs').getPublicUrl(fileName);
      await supabase.from('student_documents').insert({
        student_id: user.id, application_id: application.id, document_type: documentType, file_url: publicUrl, verified: false
      });
      await addPoints('Document uploaded', 20);
      alert(`${documentType} uploaded`);
      loadData();
    } catch (err) { alert('Upload failed'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const processPayment = async () => {
    if (!application || application.status !== 'approved') { alert('Application must be approved first'); return; }
    setProcessingPayment(true);
    setTimeout(async () => {
      const { error } = await supabase.from('payments').insert({
        student_id: user.id, application_id: application.id, amount: application.total_fees,
        status: 'paid', transaction_id: 'MOCK_' + Date.now(), paid_at: new Date().toISOString()
      });
      if (!error) {
        await supabase.from('applications').update({ payment_status: 'paid', status: 'enrolled' }).eq('id', application.id);
        await supabase.from('enrollments').insert({ student_id: user.id, program_id: application.program_id, status: 'active', progress: 0 });
        await addPoints('Course payment completed', 100);
        alert('Payment successful!');
        loadData();
      } else alert('Payment failed');
      setProcessingPayment(false);
    }, 1500);
  };

  // ---------- Referral Helpers (Student/Affiliate) ----------
  const copyShortLink = () => {
    navigator.clipboard.writeText(shortLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (online && user) {
      supabase.from('student_referral_clicks').insert({ student_id: user.id, clicked_at: new Date().toISOString(), referrer_url: 'copy_share' });
      addPoints('Referral click', 5);
    } else offlineQueue.addEvent({ type: 'click', url: 'copy_share', timestamp: new Date().toISOString() });
  };

  const shareLink = async (platform: string) => {
    const text = `Join me on our student rewards program! Use my link: ${shortLink}`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortLink)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shortLink)}`,
      email: `mailto:?subject=Student Rewards&body=${encodeURIComponent(text)}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
    if (online && user) await addPoints('Social share', 20);
    else await offlineQueue.addEvent({ type: 'share', timestamp: new Date().toISOString() });
  };

  const generateStatus = () => {
    setGenerating(true);
    setTimeout(() => {
      const templates = [
        "🚀 Join me on our student rewards program! Use my referral link: {link}",
        "💰 Earn points and rewards by referring friends. Sign up with my link today!",
      ];
      const status = templates[Math.floor(Math.random() * templates.length)].replace('{link}', shortLink);
      setWhatsappStatus(status);
      setGenerating(false);
    }, 500);
  };

  // ---------- UI Helpers ----------
  const toggleVoice = () => {
    setVoiceActive(!voiceActive);
    if (!voiceActive) setTimeout(() => { setSearchQuery("Introduction to program"); setVoiceActive(false); }, 3000);
  };

  const levelProgress = points.level ? ((points.points % 500) / 500) * 100 : 0;
  const canAccessTab = (tab: string) => {
    if (role === 'student') return true;
    if (tab === 'courses') return false;
    if (tab === 'documents') return false;
    return true;
  };

  // Navigation items based on role
  const getNavItems = () => {
    const base = [
      { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} /> },
      { id: 'applications', label: 'Applications', icon: <FileText size={20} /> },
      { id: 'payments', label: 'Payments', icon: <CreditCard size={20} /> },
    ];
    if (role === 'student') {
      return [
        ...base,
        { id: 'application', label: 'My Application', icon: <FileText size={20} /> },
        { id: 'documents', label: 'Documents', icon: <Upload size={20} /> },
        { id: 'courses', label: 'My Courses', icon: <BookOpen size={20} /> },
        { id: 'refer-earn', label: 'Refer & Earn', icon: <Gift size={20} /> },
        { id: 'points', label: 'Rewards', icon: <Award size={20} /> },
      ];
    }
    if (role === 'recruiter' || role === 'affiliate') {
      return [...base, { id: 'commissions', label: 'Commissions', icon: <DollarSign size={20} /> }];
    }
    if (role === 'institution_admin' || role === 'consultancy_admin') {
      return [...base, { id: 'programs', label: 'Programs', icon: <BookOpen size={20} /> }];
    }
    return base;
  };

  // ---------- Render ----------
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-100'} transition-colors duration-500`}>
      {/* Achievement Toast */}
      {showAchievement && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
          <Zap size={20} /><div><p className="font-bold">+{showAchievement.points} points!</p><p className="text-xs">{showAchievement.message}</p></div>
        </div>
      )}

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/10 backdrop-blur rounded-lg border border-white/20">
          <Menu size={20} className="text-white" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-40 w-72 h-screen ${darkMode ? 'bg-black/80 backdrop-blur-xl border-r border-white/10' : 'bg-white/80 backdrop-blur-xl border-r border-gray-200'} shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Global Smart Recruitment</h2>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400"><X size={20} /></button>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-6">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <span className="text-white font-bold">{profile?.full_name?.[0] || 'U'}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-black"></div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{profile?.full_name?.split(' ')[0] || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize">{role}</p>
            </div>
            <div className="relative">
              <Bell size={18} className="text-gray-400" />
              {notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </div>
          </div>
          <nav className="space-y-1">
            {getNavItems().map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all ${activeTab === item.id ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5'}`}>
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-xs text-gray-500">Powered by Global Smart Student Recruitment</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="relative"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className={`pl-10 pr-12 py-2 rounded-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300'} border focus:ring-2 focus:ring-cyan-400 w-64 md:w-96`} /></div>
              <button onClick={toggleVoice}><Mic size={18} className={`${voiceActive ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} /></button>
            </div>
            <div className="flex items-center gap-3">
              {role === 'student' && <button onClick={dailyCheckIn} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">Daily Check-in (+10)</button>}
              <button onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4"><p className="text-gray-400">Total Applications</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
            <div className="bg-white/5 rounded-xl p-4"><p className="text-gray-400">Pending</p><p className="text-2xl font-bold text-yellow-400">{stats.pending}</p></div>
            <div className="bg-white/5 rounded-xl p-4"><p className="text-gray-400">Approved</p><p className="text-2xl font-bold text-green-400">{stats.approved}</p></div>
            <div className="bg-white/5 rounded-xl p-4"><p className="text-gray-400">Revenue</p><p className="text-2xl font-bold text-cyan-400">{formatCurrency(stats.revenue)}</p></div>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6">
                <p className="text-cyan-400 text-sm">✨ AI ADVISOR</p>
                <p className="text-xl text-white">{generateAIAdvisorMessage(profile?.full_name?.split(' ')[0] || 'User', points.points, points.level)}</p>
              </div>
              {role === 'student' && !application && (
                <div className="bg-white/5 rounded-2xl p-6 text-center">
                  <h3 className="text-xl font-bold text-white mb-4">Start Your Journey</h3>
                  <select value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)} className="w-full p-2 bg-black/50 border rounded mb-4 text-white">
                    <option value="">Select Program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.title} - {formatCurrency(p.fee)}</option>)}
                  </select>
                  <button onClick={createApplication} disabled={!selectedProgramId} className="px-4 py-2 bg-cyan-500 rounded">Create Application</button>
                </div>
              )}
              {/* Show recent applications, payments, etc. */}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Applications</h2>
              <table className="w-full text-left">
                <thead className="border-b border-white/10"><tr><th className="py-2">Student</th><th>Program</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {applications.map(app => (
                    <tr key={app.id} className="border-b border-white/10"><td className="py-2">{app.leads?.name}</td><td>{app.institution_programs?.program_name}</td><td>{app.application_status}</td><td>{formatDate(app.submitted_at)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Payments</h2>
              <table className="w-full text-left">
                <thead><tr><th>Student</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}><td>{p.leads?.name}</td><td>{formatCurrency(p.amount)}</td><td>{p.status}</td><td>{formatDate(p.created_at)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Commissions Tab (Recruiter/Affiliate) */}
          {(activeTab === 'commissions' && (role === 'recruiter' || role === 'affiliate')) && (
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Commissions</h2>
              <table className="w-full"><thead><tr><th>Student</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{commissions.map(c => (<tr key={c.id}><td>{c.student_id}</td><td>{formatCurrency(c.commission_amount)}</td><td>{c.status}</td><td>{formatDate(c.created_at)}</td></tr>))}</tbody></table>
            </div>
          )}

          {/* Programs Tab (Institution/Consultancy) */}
          {activeTab === 'programs' && (role === 'institution_admin' || role === 'consultancy_admin') && (
            <div className="bg-white/5 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Programs</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {programs.map(p => (
                  <div key={p.id} className="border border-white/10 rounded p-4"><h3 className="font-bold text-white">{p.title}</h3><p>Fee: {formatCurrency(p.fee)}</p><p>Duration: {p.duration}</p></div>
                ))}
              </div>
            </div>
          )}

          {/* Student-specific tabs */}
          {role === 'student' && activeTab === 'application' && application && (
            <div className="bg-white/5 rounded-2xl p-6"><h2 className="text-xl font-semibold text-white mb-4">My Application</h2><div className="space-y-2"><p>Program: {programs.find(p => p.id === application.program_id)?.title}</p><p>Status: {application.status}</p><p>Total Fees: {formatCurrency(application.total_fees)}</p>{application.status === 'draft' && <button onClick={submitApplication} disabled={submittingApp} className="bg-cyan-500 px-4 py-2 rounded">Submit Application</button>}{application.status === 'approved' && application.payment_status !== 'paid' && <button onClick={processPayment} disabled={processingPayment} className="bg-green-500 px-4 py-2 rounded">Pay Now</button>}</div></div>
          )}
          {role === 'student' && activeTab === 'documents' && (
            <div className="bg-white/5 rounded-2xl p-6"><h2 className="text-xl font-semibold text-white mb-4">Documents</h2><div className="grid md:grid-cols-3 gap-4">{['id','transcript','certificate'].map(t => (<div key={t} className="border rounded p-4"><p className="capitalize">{t}</p>{documents.some(d => d.document_type === t) ? <CheckCircle className="text-green-400" /> : <button onClick={() => { setDocumentType(t as any); document.getElementById('docUpload')?.click(); }} className="text-cyan-400">Upload</button>}</div>))}<input type="file" id="docUpload" onChange={handleDocumentUpload} className="hidden" /></div></div>
          )}
          {role === 'student' && activeTab === 'courses' && application?.status === 'enrolled' && (
            <div className="bg-white/5 rounded-2xl p-6"><h2 className="text-xl font-semibold text-white mb-4">My Courses</h2>{enrollments.map(c => (<div key={c.id} className="border rounded p-4 mb-2"><h3 className="font-bold">{c.program?.title}</h3><p>Progress: {c.progress}%</p><div className="w-full bg-gray-700 h-2 rounded"><div className="bg-cyan-400 h-2 rounded" style={{ width: `${c.progress}%` }}></div></div></div>))}</div>
          )}
          {role === 'student' && activeTab === 'refer-earn' && application && (
            <div className="space-y-6"><div className="bg-white/5 rounded-2xl p-6"><h2 className="text-xl font-semibold text-white mb-3">Your Referral Link</h2><div className="flex gap-2"><input readOnly value={shortLink} className="flex-1 bg-black/30 p-2 rounded" /><button onClick={copyShortLink} className="bg-cyan-500 px-4 py-2 rounded">Copy</button></div><div className="flex gap-2 mt-4">{['whatsapp','facebook','twitter','linkedin','email'].map(p => (<button key={p} onClick={() => shareLink(p)} className="p-2 bg-white/10 rounded-full">{p === 'whatsapp' && <Phone size={16}/>}{p === 'facebook' && <FaFacebook size={16}/>}{p === 'twitter' && <FaTwitter size={16}/>}{p === 'linkedin' && <FaLinkedin size={16}/>}{p === 'email' && <FaEnvelope size={16}/>}</button>))}</div><button onClick={generateStatus} className="mt-2 text-sm text-cyan-400">Generate WhatsApp Status</button>{whatsappStatus && <div className="mt-2 p-2 bg-gray-800 rounded">{whatsappStatus}</div>}</div><div className="grid grid-cols-3 gap-4"><div className="bg-white/5 rounded p-4 text-center"><MousePointerClick className="mx-auto"/><p className="text-2xl font-bold text-white">{referralStats.clicks}</p><p>Clicks</p></div><div className="bg-white/5 rounded p-4 text-center"><Users className="mx-auto"/><p className="text-2xl font-bold text-white">{referralStats.conversions}</p><p>Signups</p></div><div className="bg-white/5 rounded p-4 text-center"><Award className="mx-auto"/><p className="text-2xl font-bold text-white">{referralStats.pointsFromReferrals}</p><p>Points</p></div></div></div>
          )}
          {role === 'student' && activeTab === 'points' && (
            <div className="bg-white/5 rounded-2xl p-6"><h2 className="text-xl font-semibold text-white mb-4">Rewards</h2><p>Points: {points.points}</p><p>Level: {points.level}</p><div className="w-full bg-gray-700 h-2 rounded mt-2"><div className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded" style={{ width: `${levelProgress}%` }}></div></div><button onClick={dailyCheckIn} className="mt-4 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded">Daily Check-in (+10)</button><div className="mt-4"><h3 className="font-semibold">Badges</h3><div className="flex gap-2 mt-2">{points.badges.map(b => <span key={b} className="bg-purple-500/20 px-2 py-1 rounded text-sm">{b}</span>)}</div></div></div>
          )}
        </div>
      </main>
    </div>
  );
}