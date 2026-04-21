'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  LayoutDashboard, Users, FileText, DollarSign, Settings, Bell, 
  Upload, MessageSquare, FileCheck, TrendingUp, Award, CreditCard,
  Menu, X, Search, RefreshCw, Loader2, Plus, Edit, Trash2, Eye,
  Send, Copy, CheckCircle, Clock, AlertCircle, UserCheck, UserX,
  Zap, Sparkles, Gift, Share2, Download, Calendar, Filter, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// -------------------- Types --------------------
interface Consultancy {
  id: string;
  consultancy_name: string;
  email: string;
  logo_url: string;
  settings: any;
}

interface Institution {
  id: string;
  institution_name: string;
  institution_code: string;
}

interface Recruiter {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  is_online: boolean;
  last_seen: string;
  total_leads: number;
  total_commission: number;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  assigned_recruiter: string;
  created_at: string;
  institution_id: string;
}

interface Commission {
  id: string;
  recruiter_id: string;
  student_id: string;
  amount: number;
  status: string;
  created_at: string;
  recruiters?: { name: string };
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_roles: string[];
  created_at: string;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface Material {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
}

// -------------------- Main Component --------------------
export default function ConsultancyDashboard() {
  const [consultancy, setConsultancy] = useState<Consultancy | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalRecruiters: 0,
    totalLeads: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    onlineRecruiters: 0,
    totalInstitutions: 0
  });
  
  // Modal states
  const [showLeadUploadModal, setShowLeadUploadModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showPayCommissionModal, setShowPayCommissionModal] = useState(false);
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState(false);
  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Form states
  const [leadFile, setLeadFile] = useState<File | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', target_roles: ['recruiter'] });
  const [templateForm, setTemplateForm] = useState({ title: '', content: '', category: 'general' });
  const [materialForm, setMaterialForm] = useState({ title: '', description: '', file: null as File | null });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedAd, setAiGeneratedAd] = useState('');
  const [generatingAd, setGeneratingAd] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMonth, setPaymentMonth] = useState(format(new Date(), 'yyyy-MM'));

  // ---------- Load Data ----------
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get consultancy linked to this user
      const { data: profile } = await supabase.from('profiles').select('consultancy_id').eq('id', user.id).single();
      if (!profile?.consultancy_id) return;
      
      const consultancyId = profile.consultancy_id;
      const { data: cons } = await supabase.from('consultancies').select('*').eq('id', consultancyId).single();
      setConsultancy(cons);
      
      // Get institutions under this consultancy
      type ConsultancyInstitution = { institutions: Institution };
      const { data: insts } = await supabase
        .from('consultancy_institutions')
        .select('institutions(*)')
        .eq('consultancy_id', consultancyId);
      const instList: Institution[] = (insts as ConsultancyInstitution[] | null)?.map(i => i.institutions) || [];
      setInstitutions(instList);
      const institutionIds = instList.map(i => i.id);
      
      // Get recruiters under these institutions
      const { data: recs } = await supabase
        .from('recruiters')
        .select('user_id, name, email, phone, profiles!inner(is_online, last_seen)')
        .in('institution_id', institutionIds);
      
      const recruiterList = await Promise.all((recs || []).map(async (r: any) => {
        const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_recruiter', r.user_id);
        const { data: comms } = await supabase.from('commissions').select('amount').eq('recruiter_id', r.user_id).eq('status', 'paid');
        const totalComm = comms?.reduce((s, c) => s + c.amount, 0) || 0;
        return {
          user_id: r.user_id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          is_online: r.profiles?.is_online || false,
          last_seen: r.profiles?.last_seen,
          total_leads: leadsCount || 0,
          total_commission: totalComm
        };
      }));
      setRecruiters(recruiterList);
      
      // Get all leads from these institutions
      const { data: leadsData } = await supabase.from('leads').select('*').in('institution_id', institutionIds).order('created_at', { ascending: false });
      setLeads(leadsData || []);
      
      // Get commissions with recruiter names
      const { data: commData } = await supabase
        .from('commissions')
        .select('*, recruiters(name)')
        .in('recruiter_id', recruiterList.map(r => r.user_id));
      setCommissions(commData || []);
      
      // Get announcements
      const { data: annData } = await supabase.from('consultancy_announcements').select('*').eq('consultancy_id', consultancyId).order('created_at', { ascending: false });
      setAnnouncements(annData || []);
      
      // Get templates
      const { data: tempData } = await supabase.from('consultancy_message_templates').select('*').eq('consultancy_id', consultancyId);
      setTemplates(tempData || []);
      
      // Get materials
      const { data: matData } = await supabase.from('consultancy_materials').select('*').eq('consultancy_id', consultancyId);
      setMaterials(matData || []);
      
      // Stats
      const onlineCount = recruiterList.filter(r => r.is_online).length;
      const pendingComms = (commData || []).filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
      const paidCommissions = (commData || []).filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
      setStats({
        totalRecruiters: recruiterList.length,
        totalLeads: leadsData?.length || 0,
        totalCommissions: paidCommissions,
        pendingCommissions: pendingComms,
        onlineRecruiters: onlineCount,
        totalInstitutions: instList.length
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!consultancy?.id) return;
    const channel = supabase
      .channel('consultancy-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commissions' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recruiters' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [consultancy, loadData]);

  // Update online status (single, correct useEffect)
  useEffect(() => {
    let currentUserId: string | null = null;

    const updateOnlineStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserId = user.id;
        await supabase.from('profiles').update({ last_seen: new Date().toISOString(), is_online: true }).eq('id', user.id);
      }
    };

    updateOnlineStatus();
    const interval = setInterval(updateOnlineStatus, 60000);

    const handleBeforeUnload = () => {
      if (currentUserId) {
        supabase.from('profiles').update({ is_online: false }).eq('id', currentUserId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // ---------- Lead Upload (CSV/Excel) - auto assign to all recruiters ----------
  const handleLeadUpload = async () => {
    if (!leadFile || !consultancy) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', leadFile);
    formData.append('consultancy_id', consultancy.id);
    try {
      const res = await fetch('/api/consultancy/upload-leads', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success(`Uploaded ${data.inserted} leads, assigned to ${recruiters.length} recruiters`);
        loadData();
        setShowLeadUploadModal(false);
        setLeadFile(null);
      } else throw new Error(data.error);
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ---------- AI Ad Generator ----------
  const generateAd = async () => {
    if (!aiPrompt) return;
    setGeneratingAd(true);
    setTimeout(() => {
      const ad = `🔥 ${aiPrompt} – Limited time offer! Enroll now and get 20% off. Join the future of education. Apply today! 🚀`;
      setAiGeneratedAd(ad);
      setGeneratingAd(false);
    }, 1500);
  };

  // ---------- Pay Commission/Salary ----------
  const payCommission = async (commissionId: string, amount: number) => {
    try {
      await supabase.from('commissions').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', commissionId);
      toast.success(`Paid ${formatCurrency(amount)}`);
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const paySalary = async (recruiterId: string, amount: number, month: string) => {
    try {
      await supabase.from('consultancy_salary_payments').insert({
        consultancy_id: consultancy?.id,
        recruiter_id: recruiterId,
        amount,
        month: new Date(month + '-01'),
        status: 'paid',
        paid_at: new Date().toISOString()
      });
      toast.success(`Salary paid to recruiter`);
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  // ---------- Share Template to Recruiters ----------
  const shareTemplate = async (template: MessageTemplate) => {
    await supabase.from('notifications').insert({
      user_id: null,
      title: `New Message Template: ${template.title}`,
      message: template.content,
      type: 'template_shared'
    });
    toast.success('Template shared with all recruiters');
  };

  // ---------- Create Announcement ----------
  const createAnnouncement = async () => {
    if (!consultancy) return;
    await supabase.from('consultancy_announcements').insert({
      consultancy_id: consultancy.id,
      title: announcementForm.title,
      content: announcementForm.content,
      target_roles: announcementForm.target_roles,
      created_by: (await supabase.auth.getUser()).data.user?.id
    });
    toast.success('Announcement posted');
    setShowAnnouncementModal(false);
    loadData();
  };

  // ---------- Upload Material ----------
  const uploadMaterial = async () => {
    if (!materialForm.file || !consultancy) return;
    setUploading(true);
    const fileExt = materialForm.file.name.split('.').pop();
    const fileName = `${consultancy.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('consultancy-materials').upload(fileName, materialForm.file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('consultancy-materials').getPublicUrl(fileName);
    await supabase.from('consultancy_materials').insert({
      consultancy_id: consultancy.id,
      title: materialForm.title,
      description: materialForm.description,
      file_url: publicUrl,
      file_type: fileExt,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id
    });
    toast.success('Material uploaded');
    setShowMaterialModal(false);
    loadData();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(val || 0);
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-600" /></div>;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'recruiters', label: 'Recruiters', icon: <Users size={20} /> },
    { id: 'leads', label: 'Leads', icon: <FileText size={20} /> },
    { id: 'commissions', label: 'Commissions & Salary', icon: <DollarSign size={20} /> },
    { id: 'announcements', label: 'Announcements', icon: <Bell size={20} /> },
    { id: 'templates', label: 'Message Templates', icon: <MessageSquare size={20} /> },
    { id: 'materials', label: 'Materials', icon: <FileCheck size={20} /> },
    { id: 'ai-ad-generator', label: 'AI Ad Generator', icon: <Sparkles size={20} /> },
    { id: 'reports', label: 'Reports', icon: <TrendingUp size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white rounded-lg shadow">
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 z-40 w-72 h-screen bg-white shadow-xl border-r transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              {consultancy?.logo_url && <img src={consultancy.logo_url} className="w-8 h-8 rounded" alt="logo" />}
              <h2 className="text-xl font-bold text-gray-800">{consultancy?.consultancy_name || 'Consultancy'}</h2>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden"><X size={20} /></button>
          </div>
          <nav className="space-y-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition ${activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                {item.icon}<span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Command Centre</h1>
            <button onClick={loadData} className="p-2 bg-gray-200 rounded-full"><RefreshCw size={18} /></button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-gray-500">Recruiters</p><p className="text-2xl font-bold">{stats.totalRecruiters}</p><p className="text-sm text-green-600">{stats.onlineRecruiters} online</p></div>
            <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-gray-500">Total Leads</p><p className="text-2xl font-bold">{stats.totalLeads}</p></div>
            <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-gray-500">Commissions Paid</p><p className="text-2xl font-bold">{formatCurrency(stats.totalCommissions)}</p></div>
            <div className="bg-white rounded-xl p-4 shadow-sm border"><p className="text-gray-500">Pending Commissions</p><p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingCommissions)}</p></div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button onClick={() => setShowLeadUploadModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Upload size={18} /> Upload Leads</button>
            <button onClick={() => setShowAnnouncementModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><Bell size={18} /> Announcement</button>
            <button onClick={() => setShowTemplateModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><MessageSquare size={18} /> Add Template</button>
            <button onClick={() => setShowMaterialModal(true)} className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"><FileCheck size={18} /> Upload Material</button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-lg font-semibold mb-3">Recent Leads</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {leads.slice(0, 10).map(lead => (
                    <div key={lead.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div><p className="font-medium">{lead.name}</p><p className="text-xs text-gray-500">{lead.email}</p></div>
                      <div><span className={`px-2 py-1 text-xs rounded-full ${lead.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{lead.status}</span></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-lg font-semibold mb-3">Recruiter Online Status</h2>
                <div className="space-y-2">
                  {recruiters.map(r => (
                    <div key={r.user_id} className="flex justify-between items-center p-2 border-b">
                      <div className="flex items-center gap-2">
                        {r.is_online ? <UserCheck className="text-green-500" size={16} /> : <UserX className="text-gray-400" size={16} />}
                        <span>{r.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{r.is_online ? 'Online' : `Last seen ${r.last_seen ? formatDistanceToNow(new Date(r.last_seen)) : 'unknown'} ago`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recruiters Tab */}
          {activeTab === 'recruiters' && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Name</th><th>Email</th><th>Status</th><th>Leads</th><th>Commission</th><th>Actions</th></tr></thead><tbody>
                {recruiters.map(r => (
                  <tr key={r.user_id} className="border-t"><td className="p-3">{r.name}</td><td className="p-3">{r.email}</td><td className="p-3">{r.is_online ? <span className="text-green-600">● Online</span> : 'Offline'}</td><td className="p-3">{r.total_leads}</td><td className="p-3">{formatCurrency(r.total_commission)}</td><td className="p-3"><button onClick={() => { setSelectedRecruiter(r); setShowPayCommissionModal(true); }} className="text-blue-600">Pay</button></td></tr>
                ))}
              </tbody></table>
            </div>
          )}

          {/* Leads Tab */}
          {activeTab === 'leads' && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-3 flex justify-between"><input type="text" placeholder="Search leads..." className="border rounded px-3 py-1" /><button className="bg-blue-600 text-white px-3 py-1 rounded">Filter</button></div>
              <table className="w-full"><thead className="bg-gray-50"><tr><th className="p-3">Name</th><th>Email</th><th>Institution</th><th>Recruiter</th><th>Status</th><th>Date</th></tr></thead><tbody>
                {leads.map(lead => (
                  <tr key={lead.id} className="border-t"><td className="p-3">{lead.name}</td><td className="p-3">{lead.email}</td><td className="p-3">{institutions.find(i => i.id === lead.institution_id)?.institution_name}</td><td className="p-3">{recruiters.find(r => r.user_id === lead.assigned_recruiter)?.name}</td><td className="p-3">{lead.status}</td><td className="p-3">{formatDate(lead.created_at)}</td></tr>
                ))}
              </tbody></table>
            </div>
          )}

          {/* Commissions & Salary Tab */}
          {activeTab === 'commissions' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border"><h2 className="text-xl font-semibold mb-4">Pending Commissions</h2><table className="w-full"><thead><tr><th>Recruiter</th><th>Amount</th><th>Student</th><th>Action</th></tr></thead><tbody>{commissions.filter(c => c.status === 'pending').map(c => (<tr key={c.id}><td>{c.recruiters?.name}</td><td>{formatCurrency(c.amount)}</td><td>{c.student_id}</td><td><button onClick={() => payCommission(c.id, c.amount)} className="bg-green-600 text-white px-3 py-1 rounded">Pay</button></td></tr>))}</tbody></table></div>
              <div className="bg-white rounded-xl p-6 shadow-sm border"><h2 className="text-xl font-semibold mb-4">Pay Salary</h2><div className="flex gap-4"><select className="border rounded p-2"><option>Select Recruiter</option>{recruiters.map(r => <option key={r.user_id} value={r.user_id}>{r.name}</option>)}</select><input type="number" placeholder="Amount" className="border rounded p-2" /><input type="month" value={paymentMonth} onChange={e => setPaymentMonth(e.target.value)} className="border rounded p-2" /><button onClick={() => { if (selectedRecruiter) paySalary(selectedRecruiter.user_id, paymentAmount, paymentMonth); }} className="bg-blue-600 text-white px-4 py-2 rounded">Pay Salary</button></div></div>
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border"><h2 className="text-xl font-semibold mb-4">Announcements</h2><div className="space-y-4">{announcements.map(a => (<div key={a.id} className="border-b pb-3"><h3 className="font-bold">{a.title}</h3><p>{a.content}</p><p className="text-xs text-gray-400">{formatDate(a.created_at)}</p></div>))}</div></div>
          )}

          {/* Message Templates Tab */}
          {activeTab === 'templates' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border"><div className="flex justify-between mb-4"><h2 className="text-xl font-semibold">Templates</h2><button onClick={() => setShowTemplateModal(true)} className="bg-green-600 text-white px-3 py-1 rounded">+ Add</button></div><div className="grid md:grid-cols-2 gap-4">{templates.map(t => (<div key={t.id} className="border rounded p-4"><h3 className="font-bold">{t.title}</h3><p className="text-sm text-gray-600">{t.content.substring(0, 100)}</p><button onClick={() => shareTemplate(t)} className="mt-2 text-blue-600">Share to Recruiters</button></div>))}</div></div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border"><h2 className="text-xl font-semibold mb-4">Shared Materials</h2><div className="grid md:grid-cols-2 gap-4">{materials.map(m => (<div key={m.id} className="border rounded p-4"><h3 className="font-bold">{m.title}</h3><p className="text-sm text-gray-600">{m.description}</p><a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm">Download</a></div>))}</div></div>
          )}

          {/* AI Ad Generator Tab */}
          {activeTab === 'ai-ad-generator' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border"><h2 className="text-xl font-semibold mb-4">AI Ad Generator</h2><textarea rows={3} placeholder="Describe your promotion..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full border rounded p-2 mb-3"></textarea><button onClick={generateAd} disabled={generatingAd} className="bg-purple-600 text-white px-4 py-2 rounded mb-3">{generatingAd ? 'Generating...' : 'Generate Ad'}</button>{aiGeneratedAd && <div className="p-4 bg-gray-100 rounded"><p>{aiGeneratedAd}</p><button onClick={() => navigator.clipboard.writeText(aiGeneratedAd)} className="mt-2 text-blue-600">Copy</button></div>}</div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border"><h2 className="text-xl font-semibold mb-4">Recruiter Performance</h2><ResponsiveContainer width="100%" height={300}><BarChart data={recruiters.map(r => ({ name: r.name, leads: r.total_leads, commission: r.total_commission }))}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="leads" fill="#3b82f6" /><Bar dataKey="commission" fill="#10b981" /></BarChart></ResponsiveContainer></div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl p-6 shadow-sm border"><h2 className="text-xl font-semibold mb-4">Consultancy Settings</h2><div className="space-y-4"><div><label>Name</label><input defaultValue={consultancy?.consultancy_name} className="w-full border rounded p-2" /></div><div><label>Email</label><input defaultValue={consultancy?.email} className="w-full border rounded p-2" /></div><button className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button></div></div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showLeadUploadModal && <Modal onClose={() => setShowLeadUploadModal(false)}><h3>Upload Leads (CSV/Excel)</h3><input type="file" accept=".csv,.xlsx" onChange={e => setLeadFile(e.target.files?.[0] || null)} /><button onClick={handleLeadUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload & Assign to Recruiters'}</button></Modal>}
      {showAnnouncementModal && <Modal onClose={() => setShowAnnouncementModal(false)}><h3>New Announcement</h3><input placeholder="Title" value={announcementForm.title} onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})} className="w-full border rounded p-2 mb-2" /><textarea placeholder="Content" value={announcementForm.content} onChange={e => setAnnouncementForm({...announcementForm, content: e.target.value})} className="w-full border rounded p-2 mb-2" /><select value={announcementForm.target_roles[0]} onChange={e => setAnnouncementForm({...announcementForm, target_roles: [e.target.value]})}><option value="recruiter">Recruiters</option><option value="student">Students</option><option value="both">Both</option></select><button onClick={createAnnouncement} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded">Post</button></Modal>}
      {showTemplateModal && <Modal onClose={() => setShowTemplateModal(false)}><h3>Add Template</h3><input placeholder="Title" value={templateForm.title} onChange={e => setTemplateForm({...templateForm, title: e.target.value})} className="w-full border rounded p-2 mb-2" /><textarea placeholder="Content" value={templateForm.content} onChange={e => setTemplateForm({...templateForm, content: e.target.value})} className="w-full border rounded p-2 mb-2" /><select value={templateForm.category} onChange={e => setTemplateForm({...templateForm, category: e.target.value})}><option>general</option><option>promotional</option><option>follow-up</option></select><button onClick={async () => { await supabase.from('consultancy_message_templates').insert({ consultancy_id: consultancy?.id, ...templateForm }); toast.success('Template added'); setShowTemplateModal(false); loadData(); }} className="mt-3 bg-green-600 text-white px-4 py-2 rounded">Save</button></Modal>}
      {showMaterialModal && <Modal onClose={() => setShowMaterialModal(false)}><h3>Upload Material</h3><input placeholder="Title" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="w-full border rounded p-2 mb-2" /><textarea placeholder="Description" value={materialForm.description} onChange={e => setMaterialForm({...materialForm, description: e.target.value})} className="w-full border rounded p-2 mb-2" /><input type="file" onChange={e => setMaterialForm({...materialForm, file: e.target.files?.[0] || null})} /><button onClick={uploadMaterial} disabled={uploading} className="mt-3 bg-orange-600 text-white px-4 py-2 rounded">Upload</button></Modal>}
      {showPayCommissionModal && selectedRecruiter && <Modal onClose={() => setShowPayCommissionModal(false)}><h3>Pay Commission/Salary to {selectedRecruiter.name}</h3><input type="number" placeholder="Amount" value={paymentAmount} onChange={e => setPaymentAmount(parseFloat(e.target.value))} className="w-full border rounded p-2 mb-2" /><input type="month" value={paymentMonth} onChange={e => setPaymentMonth(e.target.value)} /><button onClick={() => paySalary(selectedRecruiter.user_id, paymentAmount, paymentMonth)} className="mt-3 bg-blue-600 text-white px-4 py-2 rounded">Pay</button></Modal>}
    </div>
  );
}

// Simple Modal component
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl max-w-md w-full p-6">{children}<button onClick={onClose} className="mt-4 text-gray-500">Close</button></div></div>;
}