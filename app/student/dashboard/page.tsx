'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import {
  Home, BookOpen, Calendar as CalendarIcon, FileText, Library, Bot, MessageCircle, Users, User,
  Bell, Search, Mic, Sparkles, ChevronRight, Star, Gift, Award, Zap, Flame, Target,
  Copy, Share2, MousePointerClick, Upload, CreditCard, CheckCircle, Clock, AlertCircle, Loader2,
  Menu, X, TrendingUp, Cloud, CloudRain, Sun, Moon, Eye, Camera, MapPin, Phone, CornerDownLeft,
  IdCard, GraduationCap, FileCheck
} from 'lucide-react';
import { FaFacebook, FaTwitter, FaLinkedin, FaEnvelope } from 'react-icons/fa';

// -------------------- Offline Queue (unchanged) --------------------
class OfflineQueue {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'student_offline';
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

// -------------------- AI Helper Functions (unchanged) --------------------
const generateAIAdvisorMessage = (name: string, points: number, level: number): string => {
  const messages = [
    `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, ${name}. Your AI advisor has prepared your optimal learning path today.`,
    `Welcome back, ${name}! Based on your progress, I've scheduled a focus session for your program.`,
    `Hey ${name}, you're only ${500 - (points % 500)} points away from level ${level + 1}. Keep going!`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

const generateAITypingMessage = (): string => {
  const tips = [
    "Did you know? Students who refer friends earn 2x more rewards.",
    "Your next deadline is approaching. Want me to remind you?",
    "I see you've been doing great on your assignments. Keep it up!",
    "Try the daily check-in to earn +10 points every morning.",
  ];
  return tips[Math.floor(Math.random() * tips.length)];
};

// -------------------- Main Component --------------------
export default function NexusDashboard() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [payments, setPayments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [points, setPoints] = useState({ points: 0, level: 1, badges: [] as string[] });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploading, setUploading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showAchievement, setShowAchievement] = useState<{ message: string; points: number } | null>(null);
  const [aiChatMessage, setAiChatMessage] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [weather, setWeather] = useState<'sunny' | 'rainy' | 'cloudy'>('sunny');
  const [darkMode, setDarkMode] = useState(true);
  const [documentType, setDocumentType] = useState<'id' | 'transcript' | 'certificate'>('id');
  const [submittingApp, setSubmittingApp] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);

  // Referral state
  const [shortLink, setShortLink] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState({ clicks: 0, conversions: 0, pointsFromReferrals: 0 });
  const [whatsappStatus, setWhatsappStatus] = useState('');
  const [generating, setGenerating] = useState(false);

  // Sample timeline & deadlines (can be dynamic)
  const timeline = [
    { time: '09:00', title: 'Core Module Lecture', duration: '1h 30m' },
    { time: '11:00', title: 'Lab Session', duration: '2h' },
    { time: '14:00', title: 'Study Group', duration: '1h' },
  ];
  const deadlines = [
    { title: 'Assignment Submission', due: 'Today, 23:59', urgent: true },
    { title: 'Project Proposal', due: 'Tomorrow, 18:00', urgent: false },
  ];
  const recommendations = [
    { title: '5-min Meditation for Focus', type: 'Mindfulness' },
    { title: 'Quick Quiz: Core Concepts', type: 'Interactive' },
    { title: 'Case Study: Industry Trends', type: 'Reading' },
  ];

  // ---------- Offline sync ----------
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    offlineQueue.init();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ---------- Points & Achievement ----------
  const addPoints = async (reason: string, pts: number) => {
    if (!user) return;
    await supabase.rpc('increment_student_points', { student_id: user.id, points_added: pts });
    await supabase.from('point_transactions').insert({ student_id: user.id, points: pts, reason });
    setShowAchievement({ message: reason, points: pts });
    setTimeout(() => setShowAchievement(null), 3000);
    loadStudentData();
  };

  const dailyCheckIn = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('student_points')
      .select('daily_checkin_last')
      .eq('student_id', user.id)
      .single();
    if (existing?.daily_checkin_last === today) {
      alert('You already checked in today!');
      return;
    }
    await supabase
      .from('student_points')
      .update({ daily_checkin_last: today })
      .eq('student_id', user.id);
    await addPoints('Daily check-in', 10);
  };

  // ---------- Load Programs (FIXED) ----------
  // ---------- Load Programs (FIXED) ----------
const loadPrograms = useCallback(async () => {
  setProgramsLoading(true);
  const { data } = await supabase
    .from('programs')
    .select('id, program_name as title, fee_structure, duration, is_active as status');
  
  // Safely transform: filter out non‑objects and cast to any
  const transformed = (data || [])
    .filter(p => p && typeof p === 'object')
    .map(p => ({
      ...(p as any),
      fee: (p as any).fee_structure?.total || 0,
    }));
  
  setPrograms(transformed);
  setProgramsLoading(false);
}, []);;

  const createApplication = async () => {
    if (!selectedProgramId) {
      alert('Please select a program');
      return;
    }
    const selectedProgram = programs.find(p => p.id === selectedProgramId);
    if (!selectedProgram) return;

    const { data, error } = await supabase
      .from('applications')
      .insert({
        student_id: user.id,
        program_id: selectedProgramId,
        total_fees: selectedProgram.fee,
        status: 'draft',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating application:', error);
      alert('Failed to create application');
    } else {
      setApplication(data);
      await addPoints('Application started', 10);
      loadStudentData();
    }
  };

  const submitApplication = async () => {
    if (!application) return;
    setSubmittingApp(true);
    // Check if required documents are uploaded (optional: enforce at least one doc)
    const requiredDocs = ['id', 'transcript'];
    const uploadedTypes = documents.map(d => d.document_type);
    const missing = requiredDocs.filter(t => !uploadedTypes.includes(t));
    if (missing.length > 0) {
      alert(`Please upload missing documents: ${missing.join(', ')}`);
      setSubmittingApp(false);
      return;
    }
    const { error } = await supabase
      .from('applications')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', application.id);
    if (!error) {
      await addPoints('Application submitted', 50);
      loadStudentData();
      alert('Application submitted! Awaiting review.');
    } else {
      alert('Failed to submit application');
    }
    setSubmittingApp(false);
  };

  // ---------- Document Upload with Category ----------
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!application) {
      alert('Please create an application first');
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${application.id}/${documentType}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('student-docs')
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('student-docs')
        .getPublicUrl(fileName);
      // Save document record
      const { error: insertError } = await supabase.from('student_documents').insert({
        student_id: user.id,
        application_id: application.id,
        document_type: documentType,
        file_url: publicUrl,
        verified: false,
      });
      if (insertError) throw insertError;
      await addPoints('Document uploaded', 20);
      loadStudentData();
      alert(`${documentType} uploaded successfully!`);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ---------- Payment (mock) ----------
  const processPayment = async () => {
    if (!application || application.status !== 'approved') {
      alert('Your application must be approved before payment');
      return;
    }
    setProcessingPayment(true);
    setTimeout(async () => {
      const { error } = await supabase.from('payments').insert({
        student_id: user.id,
        application_id: application.id,
        amount: application.total_fees,
        status: 'paid',
        transaction_id: 'MOCK_' + Date.now(),
        paid_at: new Date().toISOString(),
      });
      if (!error) {
        await supabase
          .from('applications')
          .update({ payment_status: 'paid', status: 'enrolled' })
          .eq('id', application.id);
        // Enroll in program (create enrollment record)
        await supabase.from('enrollments').insert({
          student_id: user.id,
          program_id: application.program_id,
          status: 'active',
          progress: 0,
        });
        await addPoints('Course payment completed', 100);
        loadStudentData();
        alert('Payment successful! You are now enrolled.');
      } else {
        alert('Payment failed');
      }
      setProcessingPayment(false);
    }, 1500);
  };

  // ---------- Load Student Data ----------
  const loadStudentData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profile);

      // Get the latest application
      const { data: app } = await supabase
        .from('applications')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setApplication(app);

      // Payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      setPayments(paymentsData || []);

      // Documents
      const { data: docs } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', user.id);
      setDocuments(docs || []);

      // Enrollments
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('*, program:program_id(*)')
        .eq('student_id', user.id);
      setEnrollments(enrolls || []);

      // Points
      const { data: ptsData } = await supabase
        .from('student_points')
        .select('points, level, badges')
        .eq('student_id', user.id)
        .single();
      if (ptsData) setPoints({ points: ptsData.points || 0, level: ptsData.level || 1, badges: ptsData.badges || [] });

      // Notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(notifs || []);

      // Referral stats
      const { count: clicks } = await supabase
        .from('student_referral_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id);
      const { data: referrals } = await supabase
        .from('referrals')
        .select('points_awarded')
        .eq('referrer_id', user.id);
      const conversions = referrals?.length || 0;
      const pointsFromReferrals = referrals?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) || 0;
      setReferralStats({ clicks: clicks || 0, conversions, pointsFromReferrals });

      // Short link
      const { data: existingShort } = await supabase
        .from('student_short_links')
        .select('short_code')
        .eq('student_id', user.id)
        .single();
      if (existingShort) {
        setShortCode(existingShort.short_code);
        setShortLink(`${window.location.origin}/r/s/${existingShort.short_code}`);
      } else {
        const initials = profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'STU';
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${initials}${random}`;
        const longUrl = `${window.location.origin}/student/refer/${user.id}`;
        await supabase.from('student_short_links').insert({ student_id: user.id, short_code: code, long_url: longUrl });
        setShortCode(code);
        setShortLink(`${window.location.origin}/r/s/${code}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentData();
    loadPrograms();
  }, [loadStudentData, loadPrograms]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('nexus-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_points', filter: `student_id=eq.${user.id}` }, () => loadStudentData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_referral_clicks', filter: `student_id=eq.${user.id}` }, () => loadStudentData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals', filter: `referrer_id=eq.${user.id}` }, () => loadStudentData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `student_id=eq.${user.id}` }, () => loadStudentData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadStudentData]);

  // AI Chat auto message
  useEffect(() => {
    const timer = setTimeout(() => {
      setAiTyping(true);
      setTimeout(() => {
        setAiChatMessage(generateAITypingMessage());
        setAiTyping(false);
      }, 1500);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Weather simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const states: ('sunny' | 'rainy' | 'cloudy')[] = ['sunny', 'rainy', 'cloudy'];
      setWeather(states[Math.floor(Math.random() * states.length)]);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Referral Helpers ----------
  const copyShortLink = () => {
    navigator.clipboard.writeText(shortLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (online && user) {
      supabase.from('student_referral_clicks').insert({ student_id: user.id, clicked_at: new Date().toISOString(), referrer_url: 'copy_share' });
      addPoints('Referral click', 5);
    } else if (!online) {
      offlineQueue.addEvent({ type: 'click', url: 'copy_share', timestamp: new Date().toISOString() });
    }
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

  const generateWhatsAppStatus = (): string => {
    const templates = [
      "🚀 Join me on our student rewards program! Use my referral link: {link}",
      "💰 Earn points and rewards by referring friends. Sign up with my link today!",
      "🎓 Study smart and earn rewards. Join using my link and start earning points.",
      "🔥 Limited time: Double points for referrals! Join now using my link.",
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(val);
  const levelProgress = points.level ? ((points.points % 500) / 500) * 100 : 0;

  // Voice search simulation
  const toggleVoice = () => {
    setVoiceActive(!voiceActive);
    if (!voiceActive) {
      setTimeout(() => {
        setSearchQuery("Introduction to program");
        setVoiceActive(false);
      }, 3000);
    }
  };

  // Navigation tabs (sidebar)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} />, requiresApp: false },
    { id: 'application', label: 'My Application', icon: <FileText size={20} />, requiresApp: false },
    { id: 'documents', label: 'Documents', icon: <Upload size={20} />, requiresApp: true },
    { id: 'courses', label: 'My Courses', icon: <BookOpen size={20} />, requiresApp: true, requiresEnrolled: true },
    { id: 'refer-earn', label: 'Refer & Earn', icon: <Gift size={20} />, requiresApp: true },
    { id: 'points', label: 'Rewards', icon: <Award size={20} />, requiresApp: false },
  ];

  // Helper: check if user can access a tab
  const canAccessTab = (tab: any) => {
    if (!tab.requiresApp) return true;
    if (!application) return false;
    if (tab.requiresEnrolled && application.status !== 'enrolled') return false;
    return true;
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>;

  // If no application exists, show program selection screen
  if (!application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A2540] to-black flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
          <h2 className="text-3xl font-bold text-white text-center mb-6">Start Your Journey</h2>
          <p className="text-gray-300 text-center mb-8">Choose a program to begin your application</p>
          {programsLoading ? (
            <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div>
          ) : (
            <div className="space-y-4">
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white"
              >
                <option value="">-- Select Program --</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.title} - {formatCurrency(p.fee)}</option>
                ))}
              </select>
              <button
                onClick={createApplication}
                disabled={!selectedProgramId}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl font-semibold disabled:opacity-50"
              >
                Create Application
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black' : 'bg-gray-100'} transition-colors duration-500 overflow-x-hidden`}>
      {/* Achievement Toast */}
      {showAchievement && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
          <Zap className="w-5 h-5" />
          <div>
            <p className="font-bold">+{showAchievement.points} points!</p>
            <p className="text-xs">{showAchievement.message}</p>
          </div>
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
              <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Global Smart Recruitment Academy</h2>
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
              <p className="text-sm font-medium text-white">{profile?.full_name?.split(' ')[0] || 'Student'}</p>
              <p className="text-xs text-gray-400">Level {points.level} • {points.points} pts</p>
            </div>
            <div className="relative">
              <Bell size={18} className="text-gray-400" />
              {notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map(item => {
              const accessible = canAccessTab(item);
              return (
                <button
                  key={item.id}
                  onClick={() => accessible && setActiveTab(item.id)}
                  disabled={!accessible}
                  className={`relative w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-300 ${
                    !accessible ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {activeTab === item.id && <div className="absolute right-3 w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-xs text-gray-500">Powered by Global Smart Student Recruitment</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header Bar */}
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur opacity-75 group-hover:opacity-100 transition"></div>
                <div className="relative w-10 h-10 bg-black rounded-full flex items-center justify-center border border-white/20">
                  <Sparkles size={18} className="text-cyan-400" />
                </div>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, assignments..."
                  className={`pl-10 pr-12 py-2 rounded-full ${darkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-cyan-400 w-64 md:w-96`}
                />
                <button onClick={toggleVoice} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Mic size={16} className={`${voiceActive ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                </button>
                {voiceActive && (
                  <div className="absolute -bottom-6 left-0 text-xs text-cyan-400 animate-pulse">
                    Listening...
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition">
                <Eye size={14} /> AR Campus View
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-bold">{profile?.full_name?.[0] || 'U'}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Application Status Banner */}
          <div className="mb-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-white/10">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <p className="text-sm text-gray-300">Application Status</p>
                <p className="text-xl font-bold text-white capitalize">{application?.status || 'Not started'}</p>
              </div>
              {application?.status === 'draft' && (
                <button
                  onClick={submitApplication}
                  disabled={submittingApp || documents.length === 0}
                  className="px-4 py-2 bg-cyan-500 rounded-lg text-white text-sm disabled:opacity-50"
                >
                  {submittingApp ? <Loader2 className="animate-spin inline" size={16} /> : 'Submit Application'}
                </button>
              )}
              {application?.status === 'approved' && application?.payment_status !== 'paid' && (
                <button onClick={processPayment} className="px-4 py-2 bg-green-500 rounded-lg text-white text-sm">Pay Now</button>
              )}
              {application?.status === 'enrolled' && <CheckCircle className="text-green-400" />}
            </div>
          </div>

          {/* Dashboard Tab (only shows after application started) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* AI Greeting + XP Orb */}
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className={`${darkMode ? 'bg-white/5' : 'bg-white/70'} backdrop-blur-xl rounded-2xl p-6 border border-white/10`}>
                    <p className="text-cyan-400 text-sm mb-1">✨ AI ADVISOR</p>
                    <p className="text-xl font-semibold text-white">
                      {generateAIAdvisorMessage(profile?.full_name?.split(' ')[0] || 'Student', points.points, points.level)}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
                      <Sparkles size={14} className="text-yellow-400" />
                      <span>Complete your application to unlock full access.</span>
                    </div>
                  </div>
                </div>
                <div className="w-full lg:w-64">
                  <div className="relative bg-gradient-to-br from-cyan-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10 text-center">
                    <div className="relative w-32 h-32 mx-auto">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#grad)" strokeWidth="6" strokeDasharray="283" strokeDashoffset={283 - (283 * (points.points % 500) / 500)} strokeLinecap="round" transform="rotate(-90 50 50)" />
                        <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-white">{Math.floor(points.points % 500)}</span>
                        <span className="text-xs text-gray-400">/500 XP</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-300">Level {points.level} Progress</p>
                  </div>
                </div>
              </div>

              {/* Application Progress Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2"><FileText className="text-cyan-400" size={20} /><h3 className="font-semibold text-white">Application</h3></div>
                  <p className="text-2xl font-bold text-white capitalize">{application?.status}</p>
                  {application?.status === 'draft' && <p className="text-xs text-gray-400 mt-1">Submit to proceed</p>}
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2"><Upload className="text-cyan-400" size={20} /><h3 className="font-semibold text-white">Documents</h3></div>
                  <p className="text-2xl font-bold text-white">{documents.length}</p>
                  <p className="text-xs text-gray-400">Uploaded</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2"><CreditCard className="text-cyan-400" size={20} /><h3 className="font-semibold text-white">Payment</h3></div>
                  <p className="text-2xl font-bold text-white capitalize">{application?.payment_status}</p>
                </div>
              </div>

              {/* Timeline & Deadlines (only if enrolled) */}
              {application?.status === 'enrolled' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className={`${darkMode ? 'bg-white/5' : 'bg-white/70'} backdrop-blur-xl rounded-2xl p-6 border border-white/10`}>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><CalendarIcon size={18} className="text-cyan-400" /> Today's Schedule</h2>
                    <div className="space-y-3">
                      {timeline.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                          <div className="w-16 text-cyan-400 font-mono text-sm">{item.time}</div>
                          <div className="flex-1"><p className="text-white font-medium">{item.title}</p><p className="text-xs text-gray-400">{item.duration}</p></div>
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`${darkMode ? 'bg-white/5' : 'bg-white/70'} backdrop-blur-xl rounded-2xl p-6 border border-white/10`}>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><AlertCircle size={18} className="text-red-400" /> Upcoming Deadlines</h2>
                    <div className="space-y-3">
                      {deadlines.map((deadline, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                          <div><p className="text-white font-medium">{deadline.title}</p><p className="text-xs text-gray-400">{deadline.due}</p></div>
                          {deadline.urgent && <div className="px-2 py-1 bg-red-500/20 rounded-full text-red-400 text-xs flex items-center gap-1 animate-pulse"><Flame size={12} /> Urgent</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Chat & Recommendations (only if enrolled) */}
              {application?.status === 'enrolled' && (
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center gap-2 mb-4"><Bot size={20} className="text-cyan-400" /><h3 className="text-white font-semibold">AI Tutor</h3></div>
                    <div className="h-32 overflow-y-auto space-y-3 mb-4">
                      <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center"><Bot size={14} className="text-cyan-400" /></div><div className="flex-1 bg-white/5 rounded-xl p-2 text-sm text-gray-300">Hello! I'm your AI learning assistant. How can I help today?</div></div>
                      {aiTyping ? <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center"><Bot size={14} className="text-cyan-400" /></div><div className="flex-1 bg-white/5 rounded-xl p-2"><div className="flex gap-1"><span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150"></span><span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-300"></span></div></div></div> : aiChatMessage && <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center"><Bot size={14} className="text-cyan-400" /></div><div className="flex-1 bg-white/5 rounded-xl p-2 text-sm text-gray-300">{aiChatMessage}</div></div>}
                    </div>
                    <div className="flex gap-2"><input type="text" placeholder="Ask me anything..." className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 border border-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-400" /><button className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition"><Send size={16} /></button></div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Sparkles size={16} className="text-yellow-400" /> Recommended for You</h3>
                    <div className="space-y-3">{recommendations.map((rec, idx) => <div key={idx} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer"><p className="text-white text-sm">{rec.title}</p><p className="text-xs text-gray-400">{rec.type}</p></div>)}</div>
                    <button className="mt-4 w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 text-sm border border-white/10 hover:border-cyan-400/50 transition">Connect to Study Buddy</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Application Tab (program details + submission) */}
          {activeTab === 'application' && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Your Application</h2>
              <div className="space-y-4">
                <div><strong className="text-white">Program:</strong> {programs.find(p => p.id === application.program_id)?.title || 'Loading...'}</div>
                <div><strong className="text-white">Status:</strong> <span className="capitalize">{application.status}</span></div>
                <div><strong className="text-white">Total Fees:</strong> {formatCurrency(application.total_fees)}</div>
                <div><strong className="text-white">Payment Status:</strong> {application.payment_status}</div>
                {application.status === 'draft' && (
                  <button onClick={submitApplication} disabled={submittingApp} className="px-4 py-2 bg-cyan-500 rounded-lg text-white">Submit Application</button>
                )}
                {application.status === 'approved' && application.payment_status !== 'paid' && (
                  <button onClick={processPayment} disabled={processingPayment} className="px-4 py-2 bg-green-500 rounded-lg text-white flex items-center gap-2">{processingPayment ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />} Pay Now</button>
                )}
              </div>
            </div>
          )}

          {/* Documents Tab (enhanced with categories) */}
          {activeTab === 'documents' && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Required Documents</h2>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <IdCard className="text-cyan-400 mb-2" size={24} />
                  <h3 className="font-semibold text-white">National ID / Passport</h3>
                  <p className="text-xs text-gray-400 mb-2">Required</p>
                  {documents.some(d => d.document_type === 'id') ? (
                    <div className="text-green-400 text-sm flex items-center gap-1"><CheckCircle size={14} /> Uploaded</div>
                  ) : (
                    <button onClick={() => { setDocumentType('id'); document.getElementById('docUpload')?.click(); }} className="mt-2 text-sm text-cyan-400">Upload</button>
                  )}
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <GraduationCap className="text-cyan-400 mb-2" size={24} />
                  <h3 className="font-semibold text-white">Secondary School Results</h3>
                  <p className="text-xs text-gray-400 mb-2">Required</p>
                  {documents.some(d => d.document_type === 'transcript') ? (
                    <div className="text-green-400 text-sm flex items-center gap-1"><CheckCircle size={14} /> Uploaded</div>
                  ) : (
                    <button onClick={() => { setDocumentType('transcript'); document.getElementById('docUpload')?.click(); }} className="mt-2 text-sm text-cyan-400">Upload</button>
                  )}
                </div>
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <FileCheck className="text-cyan-400 mb-2" size={24} />
                  <h3 className="font-semibold text-white">Postgraduate Certificates (if any)</h3>
                  <p className="text-xs text-gray-400 mb-2">Optional</p>
                  {documents.some(d => d.document_type === 'certificate') ? (
                    <div className="text-green-400 text-sm flex items-center gap-1"><CheckCircle size={14} /> Uploaded</div>
                  ) : (
                    <button onClick={() => { setDocumentType('certificate'); document.getElementById('docUpload')?.click(); }} className="mt-2 text-sm text-cyan-400">Upload</button>
                  )}
                </div>
              </div>
              <input type="file" onChange={handleDocumentUpload} className="hidden" id="docUpload" />
              <div className="mt-4">
                <h3 className="font-semibold text-white mb-2">Uploaded Documents</h3>
                {documents.map(doc => (
                  <div key={doc.id} className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="capitalize">{doc.document_type}</span>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm">View</a>
                  </div>
                ))}
                {documents.length === 0 && <p className="text-gray-400">No documents uploaded yet</p>}
              </div>
            </div>
          )}

          {/* Courses Tab (only if enrolled) */}
          {activeTab === 'courses' && application?.status === 'enrolled' && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">My Courses</h2>
              {enrollments.length > 0 ? enrollments.map(c => (
                <div key={c.id} className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                  <h3 className="text-white font-bold">{c.program?.title || 'Course'}</h3>
                  <p>Progress: {c.progress}%</p>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-2"><div className="bg-cyan-400 h-2 rounded-full" style={{ width: `${c.progress}%` }}></div></div>
                </div>
              )) : <p className="text-gray-400">No courses enrolled yet.</p>}
            </div>
          )}

          {/* Refer & Earn Tab (only if application submitted) */}
          {activeTab === 'refer-earn' && application && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-pink-500 to-orange-500 p-4 rounded-xl text-white text-sm font-medium flex items-center gap-2 animate-pulse"><Flame size={18} /> Limited Boost: Earn DOUBLE points for referrals today!</div>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><Gift className="text-cyan-400" /> Your Referral Link</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-black/30 rounded-lg p-3 border border-white/10"><code className="text-sm break-all text-gray-300">{shortLink}</code></div>
                  <button onClick={copyShortLink} className="px-4 py-2 bg-cyan-500 text-white rounded-lg flex items-center gap-2"><Copy size={16} />{copied ? 'Copied!' : 'Copy'}</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['whatsapp', 'facebook', 'twitter', 'linkedin', 'email'].map(platform => (
                    <button key={platform} onClick={() => shareLink(platform)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                      {platform === 'whatsapp' && <Phone size={16} />}
                      {platform === 'facebook' && <FaFacebook size={16} />}
                      {platform === 'twitter' && <FaTwitter size={16} />}
                      {platform === 'linkedin' && <FaLinkedin size={16} />}
                      {platform === 'email' && <FaEnvelope size={16} />}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-400"><p>💰 1 signup = <span className="text-cyan-400 font-bold">50 pts</span> | 🚀 10 signups = <span className="text-yellow-400 font-bold">500 pts + badge</span></p></div>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-xl p-4 text-center"><MousePointerClick className="mx-auto text-cyan-400" /> <p className="text-2xl font-bold text-white">{referralStats.clicks}</p><p className="text-sm text-gray-400">Clicks</p></div>
                <div className="bg-white/5 rounded-xl p-4 text-center"><Users className="mx-auto text-green-400" /> <p className="text-2xl font-bold text-white">{referralStats.conversions}</p><p className="text-sm text-gray-400">Signups</p></div>
                <div className="bg-white/5 rounded-xl p-4 text-center"><Award className="mx-auto text-purple-400" /> <p className="text-2xl font-bold text-white">{referralStats.pointsFromReferrals}</p><p className="text-sm text-gray-400">Points Earned</p></div>
              </div>
            </div>
          )}

          {/* Points Tab (always accessible) */}
          {activeTab === 'points' && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Rewards & Gamification</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p><strong className="text-white">Total Points:</strong> <span className="text-cyan-400">{points.points}</span></p>
                  <p><strong className="text-white">Level:</strong> {points.level}</p>
                  <div className="mt-3"><div className="w-full bg-white/10 h-2 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full" style={{ width: `${levelProgress}%` }}></div></div><p className="text-xs text-gray-400 mt-1">{points.points % 500}/500 to next level</p></div>
                  <button onClick={dailyCheckIn} className="mt-4 bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg border border-yellow-500/30">Daily Check-in (+10)</button>
                </div>
                <div><h3 className="font-semibold text-white mb-2">Ways to Earn Points</h3><ul className="space-y-1 text-sm text-gray-300"><li>✓ Daily check-in – 10 pts</li><li>✓ Referral click – 5 pts</li><li>✓ Social share – 20 pts</li><li>✓ Successful referral – 50 pts</li><li>✓ Complete payment – 100 pts</li></ul></div>
              </div>
            </div>
          )}

          {/* Placeholder for other tabs */}
          {['calendar', 'assignments', 'library', 'ai-tutor', 'messages', 'community', 'profile'].includes(activeTab) && (
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-12 text-center border border-white/10">
              <Sparkles size={48} className="mx-auto text-cyan-400 mb-4 opacity-50" />
              <h2 className="text-2xl font-semibold text-white capitalize">{activeTab} Module</h2>
              <p className="text-gray-400 mt-2">Coming soon in the next update.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Helper icon for Send
function Send(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
}