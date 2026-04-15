'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import {
  Copy, Share2, DollarSign, Users, MousePointerClick,
  RefreshCw, CheckCircle, Clock, AlertCircle, Trophy, Award,
  Loader2, Linkedin, Mail, Phone, Sparkles, TrendingUp, Calendar, Star
} from 'lucide-react';
import { FaFacebook, FaTwitter, FaLinkedin } from 'react-icons/fa';

// -------------------- Offline Queue (IndexedDB) --------------------
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

// -------------------- AI Status Generator (Mock) --------------------
const generateWhatsAppStatus = (): string => {
  const templates = [
    "🎓 Just joined an amazing program! Use my referral link to earn rewards when you sign up. #StudySmart",
    "🚀 Unlock your future with our student rewards program. Click my link and start earning points!",
    "✨ Refer a friend and get bonus points! Limited time offer. DM me for details.",
    "📚 Every referral helps you earn rewards. Share the link and let's grow together!",
  ];
  return templates[Math.floor(Math.random() * templates.length)];
};

// -------------------- Main Component --------------------
export default function StudentsPage() {
  const [user, setUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null); // from 'students' table
  const [stats, setStats] = useState({
    totalClicks: 0,
    totalReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    points: 0,
    level: 1,
    badges: [] as string[],
  });
  const [pointTransactions, setPointTransactions] = useState<any[]>([]);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shortCode, setShortCode] = useState('');
  const [shortLink, setShortLink] = useState('');
  const [whatsappStatus, setWhatsappStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

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
          await supabase.from('student_referral_clicks').insert({
            student_id: user?.id,
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
    loadData();
  };

  // ---------- Points & Gamification ----------
  const addPoints = async (reason: string, points: number) => {
    if (!user) return;
    const { error: updateError } = await supabase.rpc('increment_student_points', { student_id: user.id, points_added: points });
    if (updateError) console.error('Points update failed', updateError);
    await supabase.from('student_point_transactions').insert({ student_id: user.id, points, reason });
    // Check for level up and badge
    const { data: newPoints } = await supabase.from('student_points').select('points, level').eq('student_id', user.id).single();
    if (newPoints && newPoints.points >= newPoints.level * 500) {
      await supabase.from('student_points').update({ level: newPoints.level + 1 }).eq('student_id', user.id);
      const newBadge = `Level ${newPoints.level + 1} Achiever`;
      await supabase.rpc('add_student_badge', { student_id: user.id, badge: newBadge });
    }
    loadData();
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
    alert('Daily check-in complete! +10 points');
  };

  // ---------- Load Data ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      setUser(user);

      // Get student record from 'students' table (original)
      const { data: studentRec } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single();
      setStudentData(studentRec);

      // Clicks on student's referral link
      const { count: clicks } = await supabase
        .from('student_referral_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id);

      // Referrals (conversions) – count distinct referred students? We'll use student_earnings as proxy
      const { data: earnings } = await supabase
        .from('student_earnings')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      const totalEarnings = earnings?.reduce((s, e) => s + e.amount, 0) || 0;
      const pending = earnings?.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0) || 0;
      const paid = earnings?.filter(e => e.status === 'paid').reduce((s, e) => s + e.amount, 0) || 0;
      const referrals = earnings?.length || 0;

      // Points & gamification
      const { data: pointsData } = await supabase
        .from('student_points')
        .select('points, level, badges')
        .eq('student_id', user.id)
        .single();
      const points = pointsData?.points || 0;
      const level = pointsData?.level || 1;
      const badges = pointsData?.badges || [];

      const { data: transactions } = await supabase
        .from('student_point_transactions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        totalClicks: clicks || 0,
        totalReferrals: referrals,
        totalEarnings,
        pendingEarnings: pending,
        paidEarnings: paid,
        points,
        level,
        badges,
      });
      setPointTransactions(transactions || []);
      setEarningsHistory(earnings || []);

      // Get or create short link
      const { data: existingShort } = await supabase
        .from('student_short_links')
        .select('short_code')
        .eq('student_id', user.id)
        .single();
      if (existingShort) {
        setShortCode(existingShort.short_code);
        setShortLink(`${window.location.origin}/r/s/${existingShort.short_code}`);
      } else {
        const initials = studentRec?.name?.split(' ').map((n: string) => n[0]).join('') || 'STU';
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${initials}${random}`;
        const longUrl = `${window.location.origin}/referral/${user.id}`;
        await supabase.from('student_short_links').insert({ student_id: user.id, short_code: code, long_url: longUrl });
        setShortCode(code);
        setShortLink(`${window.location.origin}/r/s/${code}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('student-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_earnings', filter: `student_id=eq.${user.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_referral_clicks', filter: `student_id=eq.${user.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_points', filter: `student_id=eq.${user.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  // ---------- Helpers ----------
  const copyShortLink = () => {
    navigator.clipboard.writeText(shortLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (online) {
      supabase.from('student_referral_clicks').insert({ student_id: user?.id, clicked_at: new Date().toISOString(), referrer_url: 'copy_share' });
      addPoints('click', 10);
    } else {
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
    if (online) await addPoints('share', 50);
    else await offlineQueue.addEvent({ type: 'share', timestamp: new Date().toISOString() });
  };

  const generateStatus = () => {
    setGenerating(true);
    setTimeout(() => {
      setWhatsappStatus(generateWhatsAppStatus());
      setGenerating(false);
    }, 500);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(value);

  if (loading && !stats.totalClicks && !stats.totalReferrals) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Rewards Dashboard</h1>
            <p className="text-gray-600">Earn points, track referrals, and unlock rewards</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {online ? '● Online' : '● Offline (sync when back)'}
          </div>
        </div>

        {error && <div className="mb-6 bg-red-50 p-4 rounded-lg text-red-700 flex gap-2"><AlertCircle />{error}</div>}

        {/* Student Info Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold">{studentData?.name || 'Student'}</h2>
              <p className="text-gray-500">Intake: {studentData?.intake || 'N/A'} • Semesters: {studentData?.semesters_completed || 0}</p>
            </div>
            <button onClick={dailyCheckIn} className="bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <Calendar size={16} /> Daily Check-in (+10)
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={MousePointerClick} label="Referral Clicks" value={stats.totalClicks.toString()} color="blue" />
          <StatCard icon={Users} label="Referrals" value={stats.totalReferrals.toString()} color="green" />
          <StatCard icon={DollarSign} label="Pending Earnings" value={formatCurrency(stats.pendingEarnings)} color="yellow" />
          <StatCard icon={Trophy} label="Reward Points" value={stats.points.toString()} subText={`Level ${stats.level}`} color="purple" />
        </div>

        {/* Badges */}
        {stats.badges.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-8 flex flex-wrap gap-2">
            {stats.badges.map((badge, i) => (
              <span key={i} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"><Award size={14} /> {badge}</span>
            ))}
          </div>
        )}

        {/* Short Referral Link */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3">Your Referral Link</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-gray-50 rounded-lg p-3 border"><code className="text-sm break-all">{shortLink || 'Generating...'}</code></div>
            <button onClick={copyShortLink} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Copy size={16} />{copied ? 'Copied!' : 'Copy'}</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {['whatsapp', 'facebook', 'twitter', 'linkedin', 'email'].map(platform => (
              <button key={platform} onClick={() => shareLink(platform)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                {platform === 'whatsapp' && <Phone size={16} />}
                {platform === 'facebook' && <FaFacebook size={16} />}
                {platform === 'twitter' && <FaTwitter size={16} />}
                {platform === 'linkedin' && <FaLinkedin size={16} />}
                {platform === 'email' && <Mail size={16} />}
              </button>
            ))}
          </div>
        </div>

        {/* AI WhatsApp Status Generator */}
        <div className="bg-white rounded-xl border p-6 mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-500" /> AI WhatsApp Status Generator</h2>
          <button onClick={generateStatus} disabled={generating} className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Generate Status</button>
          {whatsappStatus && <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">{whatsappStatus}</div>}
        </div>

        {/* Earnings History & Points Transactions */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Earnings Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Earnings History</h2>
              <button onClick={loadData}><RefreshCw size={16} /></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr><th className="px-6 py-3 text-left text-xs">Date</th><th>Source</th><th className="text-right">Amount</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {earningsHistory.length ? earningsHistory.map(e => (
                    <tr key={e.id}>
                      <td className="px-6 py-4 text-sm">{format(new Date(e.created_at), 'dd MMM yyyy')}</td>
                      <td className="capitalize">{e.source || 'Referral'}</td>
                      <td className="text-right font-medium">{formatCurrency(e.amount)}</td>
                      <td><span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${e.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{e.status === 'paid' ? <CheckCircle size={12} /> : <Clock size={12} />}{e.status}</span></td>
                    </tr>
                  )) : <tr><td colSpan={4} className="p-6 text-center">No earnings yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Points Transactions */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b"><h2 className="text-lg font-semibold">Points Activity</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr><th className="px-6 py-3 text-left text-xs">Date</th><th>Action</th><th className="text-right">Points</th></tr>
                </thead>
                <tbody>
                  {pointTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td className="px-6 py-4 text-sm">{format(new Date(tx.created_at), 'dd MMM yyyy')}</td>
                      <td className="capitalize">{tx.reason}</td>
                      <td className="text-right font-medium text-blue-600">+{tx.points}</td>
                    </tr>
                  ))}
                  {pointTransactions.length === 0 && <tr><td colSpan={3} className="p-6 text-center">No points yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper StatCard component
function StatCard({ icon: Icon, label, value, subText, color }: any) {
  const colors: Record<string, string> = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    yellow: 'text-yellow-500',
    purple: 'text-purple-500',
  };
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subText && <p className="text-xs text-gray-400 mt-1">{subText}</p>}
        </div>
        <Icon className={`w-8 h-8 ${colors[color] || 'text-gray-500'}`} />
      </div>
    </div>
  );
}