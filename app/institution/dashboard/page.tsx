'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import {
  Building2, Users, GraduationCap, DollarSign, FileText, Settings,
  CheckCircle, Clock, AlertCircle, Plus, Edit, Trash2, Eye, Download,
  Upload, X, RefreshCw, TrendingUp, Calendar, BookOpen, Home, FileCheck,
  CreditCard, Award, BarChart3, MessageSquare, Zap, Search, Filter, ChevronLeft, ChevronRight, UserPlus, Shield, Mail as MailIcon
} from 'lucide-react';

// Lazy load components
const CommunicationsHub = dynamic(() => import('@/app/dashboard/components/CommunicationsHub'));
const AnalyticsDashboard = dynamic(() => import('@/app/dashboard/components/AnalyticsDashboard'));
const AutomationEngine = dynamic(() => import('@/app/dashboard/components/AutomationEngine'));

// Types
interface Institution {
  id: string; institution_code: string; institution_name: string; email: string; phone: string; address: string; logo_url: string; website: string; settings: any;
}
interface Program { id: string; program_code: string; program_name: string; description: string; duration: string; qualification_level: string; fee_structure: any; intake_months: string[]; is_active: boolean; }
interface Commission { id: string; program_id: string; commission_type: string; commission_value: number; is_active: boolean; }
interface Document { id: string; document_type: string; title: string; file_url: string; }
interface Accommodation { 
  id: string; 
  accommodation_name: string; 
  room_type: string; 
  price_per_semester: number; 
  capacity: number; 
  available_spots: number; 
  is_active: boolean;
  amenities?: string[];
}
interface Application { id: string; lead_id: string; lead_name?: string; lead_email?: string; program_name?: string; application_status: string; submitted_at: string; admission_letter_url?: string; }
interface PaymentApproval { id: string; lead_id: string; lead_name?: string; payment_id: string; amount: number; status: string; proof_url: string; created_at: string; }
interface CommissionClaim { id: string; lead_id: string; lead_name?: string; recruiter_name?: string; commission_amount: number; status: string; claimed_at: string; }
interface TeamMember { id: string; user_id: string; email?: string; full_name?: string; role: string; permissions: any; created_at: string; }

export default function InstitutionDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [paymentApprovals, setPaymentApprovals] = useState<PaymentApproval[]>([]);
  const [commissionClaims, setCommissionClaims] = useState<CommissionClaim[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState({ totalLeads: 0, totalApplications: 0, pendingApprovals: 0, totalCommissionPaid: 0, pendingCommissionClaims: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Pagination states
  const [appPage, setAppPage] = useState(1); const [appLimit] = useState(10);
  const [payPage, setPayPage] = useState(1); const [payLimit] = useState(10);
  const [claimPage, setClaimPage] = useState(1); const [claimLimit] = useState(10);
  const [progPage, setProgPage] = useState(1); const [progLimit] = useState(10);
  
  // Search/filter
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [payStatusFilter, setPayStatusFilter] = useState('all');
  const [claimStatusFilter, setClaimStatusFilter] = useState('all');
  
  // Modal states
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  // Form states
  const [programForm, setProgramForm] = useState({ program_code: '', program_name: '', description: '', duration: '', qualification_level: '', fee_structure: { tuition: 0, application_fee: 0 }, intake_months: [] as string[], is_active: true });
  const [commissionForm, setCommissionForm] = useState({ program_id: '', commission_type: 'percentage', commission_value: 0, is_active: true });
  
  // ✅ FIXED: Explicitly typed accommodationForm with amenities: string[]
  const [accommodationForm, setAccommodationForm] = useState<{
    accommodation_name: string;
    room_type: string;
    price_per_semester: number;
    capacity: number;
    available_spots: number;
    amenities: string[];
    is_active: boolean;
  }>({
    accommodation_name: '',
    room_type: '',
    price_per_semester: 0,
    capacity: 0,
    available_spots: 0,
    amenities: [],
    is_active: true,
  });
  
  const [teamForm, setTeamForm] = useState({ email: '', role: 'marketing' });
  const [agreementUrl, setAgreementUrl] = useState('');

  useEffect(() => { checkUser(); }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);
      await loadInstitutionData(user.id);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const loadInstitutionData = async (userId: string) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', userId).single();
      if (!profile?.institution_id) { setInstitution(null); setLoading(false); return; }
      const institutionId = profile.institution_id;

      const { data: inst } = await supabase.from('institutions').select('*').eq('id', institutionId).single();
      setInstitution(inst);

      const { data: progData } = await supabase.from('institution_programs').select('*').eq('institution_id', institutionId).order('program_name');
      setPrograms(progData || []);

      const { data: commData } = await supabase.from('institution_commissions').select('*').eq('institution_id', institutionId);
      setCommissions(commData || []);

      const { data: docData } = await supabase.from('institution_documents').select('*').eq('institution_id', institutionId);
      setDocuments(docData || []);

      const { data: accData } = await supabase.from('institution_accommodation').select('*').eq('institution_id', institutionId);
      setAccommodations(accData || []);

      const { data: appData } = await supabase.from('leads').select(`id, name, email, institution_applications!inner(application_status, submitted_at, admission_letter_url), institution_programs(program_name)`).eq('institution_id', institutionId);
      const formattedApps = (appData || []).map((lead: any) => ({ id: lead.institution_applications[0]?.id, lead_id: lead.id, lead_name: lead.name, lead_email: lead.email, program_name: lead.institution_programs?.program_name, application_status: lead.institution_applications[0]?.application_status, submitted_at: lead.institution_applications[0]?.submitted_at, admission_letter_url: lead.institution_applications[0]?.admission_letter_url }));
      setApplications(formattedApps);

      const { data: payData } = await supabase.from('institution_payment_approvals').select(`*, leads(name), student_payments(amount, proof_url)`).eq('institution_id', institutionId);
      const formattedPayments = (payData || []).map((p: any) => ({ id: p.id, lead_id: p.lead_id, lead_name: p.leads?.name, payment_id: p.payment_id, amount: p.student_payments?.amount, status: p.status, proof_url: p.student_payments?.proof_url, created_at: p.created_at }));
      setPaymentApprovals(formattedPayments);

      const { data: claimData } = await supabase.from('institution_commission_claims').select(`*, leads(name), profiles(full_name)`).eq('institution_id', institutionId);
      const formattedClaims = (claimData || []).map((c: any) => ({ id: c.id, lead_id: c.lead_id, lead_name: c.leads?.name, recruiter_name: c.profiles?.full_name, commission_amount: c.commission_amount, status: c.status, claimed_at: c.claimed_at }));
      setCommissionClaims(formattedClaims);

      const { data: teamData } = await supabase.from('institution_team_members').select(`*, profiles!inner(email, full_name)`).eq('institution_id', institutionId);
      const formattedTeam = (teamData || []).map((t: any) => ({ id: t.id, user_id: t.user_id, email: t.profiles?.email, full_name: t.profiles?.full_name, role: t.role, permissions: t.permissions, created_at: t.created_at }));
      setTeamMembers(formattedTeam);

      setStats({ totalLeads: appData?.length || 0, totalApplications: formattedApps.length, pendingApprovals: formattedPayments.filter(p => p.status === 'pending').length, totalCommissionPaid: formattedClaims.filter(c => c.status === 'paid').reduce((s, c) => s + c.commission_amount, 0), pendingCommissionClaims: formattedClaims.filter(c => c.status === 'pending').length, totalRevenue: 0 });
      
      // Fetch agreement
      const { data: agreement } = await supabase
        .from('institution_agreements')
        .select('pdf_url')
        .eq('institution_id', institutionId)
        .maybeSingle();
      if (agreement) setAgreementUrl(agreement.pdf_url);
    } catch (error) { console.error(error); }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string, leadId: string) => {
    try {
      await supabase.from('institution_applications').update({ application_status: newStatus, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', applicationId);
      if (newStatus === 'approved') {
        await fetch(`/api/generate-institution-acceptance-letter/${applicationId}`, { method: 'POST' });
        toast.success('Application approved and letter generated!');
      } else toast.success(`Application ${newStatus}`);
      loadInstitutionData(user.id);
    } catch (error) { toast.error('Failed to update application'); }
  };

  const handleApprovePayment = async (approvalId: string) => {
    try {
      await supabase.from('institution_payment_approvals').update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', approvalId);
      toast.success('Payment approved');
      loadInstitutionData(user.id);
    } catch (error) { toast.error('Failed'); }
  };

  const handleApproveCommissionClaim = async (claimId: string) => {
    try {
      await supabase.from('institution_commission_claims').update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', claimId);
      toast.success('Claim approved');
      loadInstitutionData(user.id);
    } catch (error) { toast.error('Failed'); }
  };

  const handlePayCommission = async (claimId: string, amount: number) => {
    try {
      await supabase.from('institution_commission_claims').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', claimId);
      toast.success(`Paid ${formatCurrency(amount)}`);
      loadInstitutionData(user.id);
    } catch (error) { toast.error('Failed'); }
  };

  // CRUD for programs
  const handleAddProgram = async () => {
    if (!institution) return;
    try {
      if (editingItem) {
        await supabase.from('institution_programs').update(programForm).eq('id', editingItem.id);
        toast.success('Program updated');
      } else {
        await supabase.from('institution_programs').insert({ institution_id: institution.id, ...programForm });
        toast.success('Program added');
      }
      setShowProgramModal(false); resetProgramForm(); loadInstitutionData(user.id);
    } catch (error) { toast.error('Failed to save program'); }
  };
  const deleteProgram = async (id: string) => {
    if (confirm('Delete this program?')) {
      await supabase.from('institution_programs').delete().eq('id', id);
      toast.success('Deleted');
      loadInstitutionData(user.id);
    }
  };
  const editProgram = (prog: Program) => { setEditingItem(prog); setProgramForm(prog); setShowProgramModal(true); };
  const resetProgramForm = () => { setEditingItem(null); setProgramForm({ program_code: '', program_name: '', description: '', duration: '', qualification_level: '', fee_structure: { tuition: 0, application_fee: 0 }, intake_months: [], is_active: true }); };

  // Commissions CRUD
  const handleAddCommission = async () => {
    if (!institution) return;
    try {
      if (editingItem) {
        await supabase.from('institution_commissions').update(commissionForm).eq('id', editingItem.id);
        toast.success('Commission updated');
      } else {
        await supabase.from('institution_commissions').insert({ institution_id: institution.id, ...commissionForm });
        toast.success('Commission added');
      }
      setShowCommissionModal(false); resetCommissionForm(); loadInstitutionData(user.id);
    } catch (error) { toast.error('Failed'); }
  };
  const deleteCommission = async (id: string) => {
    if (confirm('Delete?')) { await supabase.from('institution_commissions').delete().eq('id', id); toast.success('Deleted'); loadInstitutionData(user.id); }
  };
  const editCommission = (comm: Commission) => { setEditingItem(comm); setCommissionForm(comm); setShowCommissionModal(true); };
  const resetCommissionForm = () => { setEditingItem(null); setCommissionForm({ program_id: '', commission_type: 'percentage', commission_value: 0, is_active: true }); };

  // Accommodation CRUD
  const handleAddAccommodation = async () => {
    if (!institution) return;
    try {
      if (editingItem) {
        await supabase.from('institution_accommodation').update(accommodationForm).eq('id', editingItem.id);
        toast.success('Accommodation updated');
      } else {
        await supabase.from('institution_accommodation').insert({ institution_id: institution.id, ...accommodationForm });
        toast.success('Accommodation added');
      }
      setShowAccommodationModal(false); resetAccommodationForm(); loadInstitutionData(user.id);
    } catch (error) { toast.error('Failed'); }
  };
  const deleteAccommodation = async (id: string) => {
    if (confirm('Delete?')) { await supabase.from('institution_accommodation').delete().eq('id', id); toast.success('Deleted'); loadInstitutionData(user.id); }
  };
  const editAccommodation = (acc: Accommodation) => { 
    setEditingItem(acc); 
    setAccommodationForm({ 
      accommodation_name: acc.accommodation_name, 
      room_type: acc.room_type, 
      price_per_semester: acc.price_per_semester, 
      capacity: acc.capacity, 
      available_spots: acc.available_spots, 
      amenities: acc.amenities || [], 
      is_active: acc.is_active 
    }); 
    setShowAccommodationModal(true); 
  };
  const resetAccommodationForm = () => { 
    setEditingItem(null); 
    setAccommodationForm({
      accommodation_name: '',
      room_type: '',
      price_per_semester: 0,
      capacity: 0,
      available_spots: 0,
      amenities: [],
      is_active: true,
    }); 
  };

  // Team management
  const inviteTeamMember = async () => {
  if (!institution) return;
  try {
    // First, check if user exists in profiles table
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', teamForm.email)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!existingProfile) {
      throw new Error('User not registered. Ask them to sign up first.');
    }

    const userId = existingProfile.id;

    // Check if already a team member
    const { data: existingMember } = await supabase
      .from('institution_team_members')
      .select('id')
      .eq('institution_id', institution.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      throw new Error('User is already a team member.');
    }

    // Add to team
    const { error } = await supabase.from('institution_team_members').insert({
      institution_id: institution.id,
      user_id: userId,
      role: teamForm.role,
      invited_by: user.id,
      permissions: {}
    });
    if (error) throw error;
    toast.success(`Invited ${teamForm.email} as ${teamForm.role}`);
    setShowTeamModal(false);
    loadInstitutionData(user.id);
  } catch (error: any) {
    toast.error(error.message);
  }
};
  const removeTeamMember = async (memberId: string) => {
    if (confirm('Remove this team member?')) {
      await supabase.from('institution_team_members').delete().eq('id', memberId);
      toast.success('Removed');
      loadInstitutionData(user.id);
    }
  };

  const handleFileUpload = async (file: File, documentType: string, title: string) => {
    if (!institution) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${institution.id}-${Date.now()}.${fileExt}`;
      const filePath = `institution-documents/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('institution-files').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('institution-files').getPublicUrl(filePath);
      await supabase.from('institution_documents').insert({ institution_id: institution.id, document_type: documentType, title: title, file_url: publicUrl, file_size: file.size, mime_type: file.type, uploaded_by: user.id });
      toast.success('Document uploaded');
      loadInstitutionData(user.id);
      setShowDocumentModal(false);
    } catch (error) { toast.error('Upload failed'); } finally { setUploading(false); }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW', minimumFractionDigits: 0 }).format(value || 0);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-ZM', { year: 'numeric', month: 'short', day: 'numeric' });
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"><Clock size={12} /> Pending</span>;
      case 'approved': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> Approved</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"><AlertCircle size={12} /> Rejected</span>;
      case 'paid': return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> Paid</span>;
      default: return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!institution) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8"><h2 className="text-2xl font-bold text-center mb-4">No Institution Linked</h2><p className="text-gray-600 text-center mb-6">Please contact the system administrator to link your account to an institution.</p><button onClick={() => router.push('/dashboard')} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Main Dashboard</button></div></div>);

  // Pagination helpers
  const paginate = (items: any[], page: number, limit: number) => items.slice((page-1)*limit, page*limit);
  const filteredApps = applications.filter(a => (appStatusFilter === 'all' || a.application_status === appStatusFilter) && (a.lead_name?.toLowerCase().includes(appSearch.toLowerCase()) || a.lead_email?.toLowerCase().includes(appSearch.toLowerCase())));
  const totalAppPages = Math.ceil(filteredApps.length / appLimit);
  const paginatedApps = paginate(filteredApps, appPage, appLimit);

  const filteredPayments = paymentApprovals.filter(p => payStatusFilter === 'all' || p.status === payStatusFilter);
  const totalPayPages = Math.ceil(filteredPayments.length / payLimit);
  const paginatedPayments = paginate(filteredPayments, payPage, payLimit);

  const filteredClaims = commissionClaims.filter(c => claimStatusFilter === 'all' || c.status === claimStatusFilter);
  const totalClaimPages = Math.ceil(filteredClaims.length / claimLimit);
  const paginatedClaims = paginate(filteredClaims, claimPage, claimLimit);

  const paginatedPrograms = paginate(programs, progPage, progLimit);
  const totalProgPages = Math.ceil(programs.length / progLimit);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div className="flex items-center gap-4">
            {institution.logo_url && <img src={institution.logo_url} alt={institution.institution_name} className="w-16 h-16 rounded-lg object-cover" />}
            <div><h1 className="text-3xl font-bold text-gray-900">{institution.institution_name}</h1><p className="text-gray-600">Institution Dashboard – Manage recruitment, programs, and commissions</p></div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Leads</p><p className="text-2xl font-bold">{stats.totalLeads}</p></div><Users className="w-8 h-8 text-blue-500" /></div></div>
          <div className="bg-white rounded-xl p-6 shadow-sm border"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Applications</p><p className="text-2xl font-bold">{stats.totalApplications}</p></div><FileCheck className="w-8 h-8 text-green-500" /></div></div>
          <div className="bg-white rounded-xl p-6 shadow-sm border"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Pending Approvals</p><p className="text-2xl font-bold">{stats.pendingApprovals}</p></div><Clock className="w-8 h-8 text-yellow-500" /></div></div>
          <div className="bg-white rounded-xl p-6 shadow-sm border"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Commission Paid</p><p className="text-2xl font-bold">{formatCurrency(stats.totalCommissionPaid)}</p></div><Award className="w-8 h-8 text-purple-500" /></div></div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex flex-wrap gap-2">
            {['overview', 'programs', 'documents', 'accommodation', 'commissions', 'applications', 'payments', 'claims', 'team', 'settings', 'communications', 'analytics', 'automations'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border"><h2 className="text-lg font-semibold mb-4">Recent Applications</h2><div className="space-y-3">{applications.slice(0,5).map(app => (<div key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><div><p className="font-medium">{app.lead_name}</p><p className="text-xs text-gray-500">{app.program_name}</p></div>{getStatusBadge(app.application_status)}</div>))}</div></div>
            <div className="bg-white rounded-xl shadow-sm p-6 border"><h2 className="text-lg font-semibold mb-4">Pending Commission Claims</h2><div className="space-y-3">{commissionClaims.filter(c => c.status === 'pending').slice(0,5).map(claim => (<div key={claim.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><div><p className="font-medium">{claim.lead_name}</p><p className="text-xs text-gray-500">Recruiter: {claim.recruiter_name}</p></div><div className="text-right"><p className="font-bold text-green-600">{formatCurrency(claim.commission_amount)}</p><button onClick={() => handleApproveCommissionClaim(claim.id)} className="mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded">Approve</button></div></div>))}</div></div>
          </div>
        )}

        {/* Programs Tab */}
        {activeTab === 'programs' && (
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2"><h2 className="text-xl font-semibold">Programs</h2><button onClick={() => { resetProgramForm(); setShowProgramModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Plus size={18} /> Add Program</button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPrograms.map(prog => (
                <div key={prog.id} className="bg-white rounded-xl shadow-sm border p-6 relative">
                  <div className="flex justify-between items-start"><div><h3 className="font-semibold text-lg">{prog.program_name}</h3><p className="text-sm text-gray-500">{prog.program_code}</p></div><span className={`px-2 py-1 text-xs rounded-full ${prog.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{prog.is_active ? 'Active' : 'Inactive'}</span></div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{prog.description}</p>
                  <div className="mt-4 space-y-1 text-sm"><p><span className="text-gray-500">Duration:</span> {prog.duration}</p><p><span className="text-gray-500">Level:</span> {prog.qualification_level}</p><p><span className="text-gray-500">Tuition:</span> {formatCurrency(prog.fee_structure?.tuition || 0)}/year</p><p><span className="text-gray-500">Intakes:</span> {prog.intake_months?.join(', ')}</p></div>
                  <div className="mt-4 flex gap-2"><button onClick={() => editProgram(prog)} className="text-blue-600 hover:text-blue-700"><Edit size={16} /></button><button onClick={() => deleteProgram(prog.id)} className="text-red-600 hover:text-red-700"><Trash2 size={16} /></button></div>
                </div>
              ))}
            </div>
            {totalProgPages > 1 && <div className="flex justify-center items-center gap-4 mt-6"><button onClick={() => setProgPage(p => Math.max(1, p-1))} disabled={progPage===1} className="px-3 py-1 border rounded">Previous</button><span>Page {progPage} of {totalProgPages}</span><button onClick={() => setProgPage(p => Math.min(totalProgPages, p+1))} disabled={progPage===totalProgPages} className="px-3 py-1 border rounded">Next</button></div>}
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Documents & Resources</h2><button onClick={() => setShowDocumentModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Upload size={18} /> Upload Document</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{documents.map(doc => (<div key={doc.id} className="bg-white rounded-xl shadow-sm border p-4 flex justify-between items-center"><div><p className="font-medium">{doc.title}</p><p className="text-xs text-gray-400 capitalize">{doc.document_type}</p></div><div className="flex gap-2"><a href={doc.file_url} target="_blank" className="p-2 text-gray-500 hover:text-blue-600"><Eye size={18} /></a><a href={doc.file_url} download className="p-2 text-gray-500 hover:text-green-600"><Download size={18} /></a></div></div>))}</div></div>
        )}

        {/* Accommodation Tab */}
        {activeTab === 'accommodation' && (
          <div><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Accommodation Options</h2><button onClick={() => { resetAccommodationForm(); setShowAccommodationModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Plus size={18} /> Add Accommodation</button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{accommodations.map(acc => (<div key={acc.id} className="bg-white rounded-xl shadow-sm border p-6"><h3 className="font-semibold text-lg">{acc.accommodation_name}</h3><p className="text-sm text-gray-500 capitalize">{acc.room_type}</p><div className="mt-3 space-y-1 text-sm"><p><span className="text-gray-500">Price per semester:</span> {formatCurrency(acc.price_per_semester)}</p><p><span className="text-gray-500">Capacity:</span> {acc.capacity}</p><p><span className="text-gray-500">Available spots:</span> {acc.available_spots}</p></div><div className="mt-2 flex gap-2"><button onClick={() => editAccommodation(acc)} className="text-blue-600"><Edit size={16} /></button><button onClick={() => deleteAccommodation(acc.id)} className="text-red-600"><Trash2 size={16} /></button></div></div>))}</div></div>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <div><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Commission Structure</h2><button onClick={() => { resetCommissionForm(); setShowCommissionModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Plus size={18} /> Add Commission Rule</button></div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody className="divide-y">{commissions.map(comm => { const program = programs.find(p => p.id === comm.program_id); return (<tr key={comm.id}><td className="px-6 py-4">{program?.program_name || 'All Programs'}</td><td className="px-6 py-4 capitalize">{comm.commission_type}</td><td className="px-6 py-4">{comm.commission_type === 'percentage' ? `${comm.commission_value}%` : formatCurrency(comm.commission_value)}</td><td className="px-6 py-4">{comm.is_active ? 'Active' : 'Inactive'}</td><td className="px-6 py-4"><div className="flex gap-2"><button onClick={() => editCommission(comm)} className="text-blue-600"><Edit size={16} /></button><button onClick={() => deleteCommission(comm.id)} className="text-red-600"><Trash2 size={16} /></button></div></td></tr>); })}</tbody></table></div></div>
        )}

        {/* Applications Tab with Pagination & Search */}
        {activeTab === 'applications' && (
          <div><div className="flex flex-wrap gap-4 mb-4 items-center"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search by name/email" value={appSearch} onChange={e => setAppSearch(e.target.value)} className="pl-9 pr-4 py-2 border rounded-lg w-64" /></div><select value={appStatusFilter} onChange={e => setAppStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">All Status</option><option value="pending_review">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody className="divide-y">{paginatedApps.map(app => (<tr key={app.id}><td className="px-6 py-4"><p className="font-medium">{app.lead_name}</p><p className="text-xs text-gray-400">{app.lead_email}</p></td><td className="px-6 py-4">{app.program_name}</td><td className="px-6 py-4">{formatDate(app.submitted_at)}</td><td className="px-6 py-4">{getStatusBadge(app.application_status)}</td><td className="px-6 py-4"><div className="flex gap-2">{app.application_status === 'pending_review' && (<><button onClick={() => handleUpdateApplicationStatus(app.id, 'approved', app.lead_id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Approve</button><button onClick={() => handleUpdateApplicationStatus(app.id, 'rejected', app.lead_id)} className="px-3 py-1 bg-red-600 text-white rounded text-xs">Reject</button></>)}{app.admission_letter_url && <a href={app.admission_letter_url} target="_blank" className="text-blue-600 text-xs">Letter</a>}</div></td></tr>))}</tbody></table></div>
          {totalAppPages > 1 && <div className="flex justify-center items-center gap-4 mt-4"><button onClick={() => setAppPage(p => Math.max(1, p-1))} disabled={appPage===1} className="px-3 py-1 border rounded">Previous</button><span>Page {appPage} of {totalAppPages}</span><button onClick={() => setAppPage(p => Math.min(totalAppPages, p+1))} disabled={appPage===totalAppPages} className="px-3 py-1 border rounded">Next</button></div>}</div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div><div className="flex gap-4 mb-4"><select value={payStatusFilter} onChange={e => setPayStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option></select></div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proof</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody className="divide-y">{paginatedPayments.map(p => (<tr key={p.id}><td className="px-6 py-4">{p.lead_name}</td><td className="px-6 py-4 font-medium">{formatCurrency(p.amount)}</td><td className="px-6 py-4">{formatDate(p.created_at)}</td><td className="px-6 py-4">{p.proof_url && <a href={p.proof_url} target="_blank" className="text-blue-600 text-sm">View</a>}</td><td className="px-6 py-4">{getStatusBadge(p.status)}</td><td className="px-6 py-4">{p.status === 'pending' && <button onClick={() => handleApprovePayment(p.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Approve</button>}</td></tr>))}</tbody></table></div>
          {totalPayPages > 1 && <div className="flex justify-center gap-4 mt-4"><button onClick={() => setPayPage(p => Math.max(1, p-1))} disabled={payPage===1} className="px-3 py-1 border rounded">Previous</button><span>Page {payPage} of {totalPayPages}</span><button onClick={() => setPayPage(p => Math.min(totalPayPages, p+1))} disabled={payPage===totalPayPages} className="px-3 py-1 border rounded">Next</button></div>}</div>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <div><div className="flex gap-4 mb-4"><select value={claimStatusFilter} onChange={e => setClaimStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="paid">Paid</option></select></div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recruiter</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody className="divide-y">{paginatedClaims.map(c => (<tr key={c.id}><td className="px-6 py-4">{c.lead_name}</td><td className="px-6 py-4">{c.recruiter_name}</td><td className="px-6 py-4 font-medium text-green-600">{formatCurrency(c.commission_amount)}</td><td className="px-6 py-4">{formatDate(c.claimed_at)}</td><td className="px-6 py-4">{getStatusBadge(c.status)}</td><td className="px-6 py-4"><div className="flex gap-2">{c.status === 'pending' && (<><button onClick={() => handleApproveCommissionClaim(c.id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs">Approve</button><button onClick={() => handlePayCommission(c.id, c.commission_amount)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Mark Paid</button></>)}</div></td></tr>))}</tbody></table></div>
          {totalClaimPages > 1 && <div className="flex justify-center gap-4 mt-4"><button onClick={() => setClaimPage(p => Math.max(1, p-1))} disabled={claimPage===1} className="px-3 py-1 border rounded">Previous</button><span>Page {claimPage} of {totalClaimPages}</span><button onClick={() => setClaimPage(p => Math.min(totalClaimPages, p+1))} disabled={claimPage===totalClaimPages} className="px-3 py-1 border rounded">Next</button></div>}</div>
        )}

        {/* Team Management Tab */}
        {activeTab === 'team' && (
          <div><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Team Members</h2><button onClick={() => setShowTeamModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><UserPlus size={18} /> Invite Member</button></div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody className="divide-y">{teamMembers.map(member => (<tr key={member.id}><td className="px-6 py-4">{member.full_name || '—'}</td><td className="px-6 py-4">{member.email}</td><td className="px-6 py-4 capitalize">{member.role}</td><td className="px-6 py-4">{member.role !== 'admin' && <button onClick={() => removeTeamMember(member.id)} className="text-red-600 hover:text-red-700"><Trash2 size={16} /></button>}</td></tr>))}</tbody></table></div></div>
        )}

        {/* Settings Tab – for institution details and agreement */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Institution Settings</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium">Institution Name</label><input type="text" defaultValue={institution.institution_name} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-sm font-medium">Email</label><input type="email" defaultValue={institution.email} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-sm font-medium">Phone</label><input type="tel" defaultValue={institution.phone} className="w-full border rounded-lg p-2" /></div>
              <div><label className="block text-sm font-medium">Address</label><textarea defaultValue={institution.address} className="w-full border rounded-lg p-2" rows={2} /></div>
              <div><label className="block text-sm font-medium">Website</label><input type="url" defaultValue={institution.website} className="w-full border rounded-lg p-2" /></div>
              <button onClick={async () => { /* implement update */ toast.success('Settings updated (demo)'); }} className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button>
            </div>
            {agreementUrl && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Signed Agreement</h3>
                <a href={agreementUrl} target="_blank" className="text-blue-600">Download Signed Copy</a>
              </div>
            )}
          </div>
        )}

        {/* Lazy-loaded tabs */}
        {activeTab === 'communications' && <CommunicationsHub institutionId={user?.id} />}
        {activeTab === 'analytics' && <AnalyticsDashboard institutionId={user?.id} />}
        {activeTab === 'automations' && <AutomationEngine institutionId={user?.id} />}
      </div>

      {/* Program Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingItem ? 'Edit Program' : 'Add Program'}</h2>
              <button onClick={() => setShowProgramModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium">Program Code</label><input type="text" className="w-full border rounded-lg p-2" value={programForm.program_code} onChange={e => setProgramForm({...programForm, program_code: e.target.value})} /></div>
              <div><label className="block text-sm font-medium">Program Name</label><input type="text" className="w-full border rounded-lg p-2" value={programForm.program_name} onChange={e => setProgramForm({...programForm, program_name: e.target.value})} /></div>
              <div><label className="block text-sm font-medium">Description</label><textarea rows={3} className="w-full border rounded-lg p-2" value={programForm.description} onChange={e => setProgramForm({...programForm, description: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">Duration</label><input type="text" className="w-full border rounded-lg p-2" value={programForm.duration} onChange={e => setProgramForm({...programForm, duration: e.target.value})} /></div>
                <div><label className="block text-sm font-medium">Qualification Level</label><select className="w-full border rounded-lg p-2" value={programForm.qualification_level} onChange={e => setProgramForm({...programForm, qualification_level: e.target.value})}><option>Certificate</option><option>Diploma</option><option>Bachelor</option><option>Master</option><option>PhD</option></select></div>
              </div>
              <div><label className="block text-sm font-medium">Tuition Fee (ZMW)</label><input type="number" className="w-full border rounded-lg p-2" value={programForm.fee_structure.tuition} onChange={e => setProgramForm({...programForm, fee_structure: {...programForm.fee_structure, tuition: parseFloat(e.target.value)}})} /></div>
              <div><label className="block text-sm font-medium">Application Fee (ZMW)</label><input type="number" className="w-full border rounded-lg p-2" value={programForm.fee_structure.application_fee} onChange={e => setProgramForm({...programForm, fee_structure: {...programForm.fee_structure, application_fee: parseFloat(e.target.value)}})} /></div>
              <div><label className="block text-sm font-medium">Intake Months (comma separated)</label><input type="text" className="w-full border rounded-lg p-2" placeholder="January, May, September" value={programForm.intake_months?.join(', ')} onChange={e => setProgramForm({...programForm, intake_months: e.target.value.split(',').map(s => s.trim())})} /></div>
              <div className="flex justify-end gap-3 pt-4"><button onClick={() => setShowProgramModal(false)} className="px-4 py-2 border rounded">Cancel</button><button onClick={handleAddProgram} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Upload Document</h2><button onClick={() => setShowDocumentModal(false)}><X size={20} /></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium">Document Type</label><select id="docType" className="w-full border rounded-lg p-2"><option value="prospectus">Prospectus</option><option value="course_outline">Course Outline</option><option value="accommodation">Accommodation</option><option value="brochure">Brochure</option><option value="other">Other</option></select></div>
              <div><label className="block text-sm font-medium">Title</label><input type="text" id="docTitle" className="w-full border rounded-lg p-2" placeholder="Document title" /></div>
              <div><label className="block text-sm font-medium">File</label><input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={(e) => { if(e.target.files?.[0]) { const docType = (document.getElementById('docType') as HTMLSelectElement).value; const docTitle = (document.getElementById('docTitle') as HTMLInputElement).value; if(!docTitle) return alert('Please enter a title'); handleFileUpload(e.target.files[0], docType, docTitle); } }} className="w-full border rounded-lg p-2" /></div>
              {uploading && <p className="text-center text-gray-500">Uploading...</p>}
            </div>
          </div>
        </div>
      )}

      {/* Accommodation Modal */}
      {showAccommodationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{editingItem ? 'Edit Accommodation' : 'Add Accommodation'}</h2><button onClick={() => setShowAccommodationModal(false)}><X size={20} /></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Accommodation Name" value={accommodationForm.accommodation_name} onChange={e => setAccommodationForm({...accommodationForm, accommodation_name: e.target.value})} className="w-full border rounded-lg p-2" />
              <input type="text" placeholder="Room Type" value={accommodationForm.room_type} onChange={e => setAccommodationForm({...accommodationForm, room_type: e.target.value})} className="w-full border rounded-lg p-2" />
              <input type="number" placeholder="Price per Semester (ZMW)" value={accommodationForm.price_per_semester} onChange={e => setAccommodationForm({...accommodationForm, price_per_semester: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" />
              <input type="number" placeholder="Capacity" value={accommodationForm.capacity} onChange={e => setAccommodationForm({...accommodationForm, capacity: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" />
              <input type="number" placeholder="Available Spots" value={accommodationForm.available_spots} onChange={e => setAccommodationForm({...accommodationForm, available_spots: parseInt(e.target.value)})} className="w-full border rounded-lg p-2" />
              <div className="flex justify-end gap-3 pt-4"><button onClick={() => setShowAccommodationModal(false)} className="px-4 py-2 border rounded">Cancel</button><button onClick={handleAddAccommodation} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Commission Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{editingItem ? 'Edit Commission' : 'Add Commission'}</h2><button onClick={() => setShowCommissionModal(false)}><X size={20} /></button></div>
            <div className="space-y-4">
              <select value={commissionForm.program_id} onChange={e => setCommissionForm({...commissionForm, program_id: e.target.value})} className="w-full border rounded-lg p-2"><option value="">All Programs</option>{programs.map(p => <option key={p.id} value={p.id}>{p.program_name}</option>)}</select>
              <select value={commissionForm.commission_type} onChange={e => setCommissionForm({...commissionForm, commission_type: e.target.value as any})} className="w-full border rounded-lg p-2"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select>
              <input type="number" placeholder="Value" value={commissionForm.commission_value} onChange={e => setCommissionForm({...commissionForm, commission_value: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" />
              <div className="flex justify-end gap-3 pt-4"><button onClick={() => setShowCommissionModal(false)} className="px-4 py-2 border rounded">Cancel</button><button onClick={handleAddCommission} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Team Invite Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Invite Team Member</h2>
            <input type="email" placeholder="Email" value={teamForm.email} onChange={e => setTeamForm({...teamForm, email: e.target.value})} className="w-full border rounded-lg p-2 mb-3" />
            <select value={teamForm.role} onChange={e => setTeamForm({...teamForm, role: e.target.value})} className="w-full border rounded-lg p-2 mb-4"><option value="finance">Finance</option><option value="marketing">Marketing</option><option value="academic">Academic</option><option value="student_services">Student Services</option></select>
            <div className="flex gap-2"><button onClick={() => setShowTeamModal(false)} className="flex-1 px-4 py-2 border rounded">Cancel</button><button onClick={inviteTeamMember} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded">Invite</button></div>
          </div>
        </div>
      )}
    </div>
  );
}