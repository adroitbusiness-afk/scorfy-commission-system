'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import {
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  FileText,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  X,
  RefreshCw,
  TrendingUp,
  Calendar,
  BookOpen,
  Home,
  FileCheck,
  CreditCard,
  Award,
  BarChart3,
  MessageSquare,
  Zap,
} from 'lucide-react';

// Lazy load new components
const CommunicationsHub = dynamic(() => import('@/app/dashboard/components/CommunicationsHub'));
const AnalyticsDashboard = dynamic(() => import('@/app/dashboard/components/AnalyticsDashboard'));
const AutomationEngine = dynamic(() => import('@/app/dashboard/components/AutomationEngine'));

interface Institution {
  id: string;
  institution_code: string;
  institution_name: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string;
  website: string;
  description: string;
  settings: any;
}

interface Program {
  id: string;
  program_code: string;
  program_name: string;
  description: string;
  duration: string;
  qualification_level: string;
  fee_structure: any;
  intake_months: string[];
  is_active: boolean;
}

interface Commission {
  id: string;
  program_id: string;
  commission_type: string;
  commission_value: number;
  is_active: boolean;
}

interface Document {
  id: string;
  document_type: string;
  title: string;
  file_url: string;
  is_public: boolean;
}

interface Accommodation {
  id: string;
  accommodation_name: string;
  room_type: string;
  price_per_semester: number;
  capacity: number;
  available_spots: number;
  is_active: boolean;
}

interface Application {
  id: string;
  lead_id: string;
  lead_name?: string;
  lead_email?: string;
  program_name?: string;
  application_status: string;
  submitted_at: string;
  admission_letter_url?: string;
}

interface PaymentApproval {
  id: string;
  lead_id: string;
  lead_name?: string;
  payment_id: string;
  amount: number;
  status: string;
  proof_url: string;
  created_at: string;
}

interface CommissionClaim {
  id: string;
  lead_id: string;
  lead_name?: string;
  recruiter_name?: string;
  commission_amount: number;
  status: string;
  claimed_at: string;
}

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
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalApplications: 0,
    pendingApprovals: 0,
    totalCommissionPaid: 0,
    pendingCommissionClaims: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAccommodationModal, setShowAccommodationModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [programForm, setProgramForm] = useState({
    program_code: '',
    program_name: '',
    description: '',
    duration: '',
    qualification_level: '',
    fee_structure: { tuition: 0, application_fee: 0 },
    intake_months: [] as string[],
    is_active: true
  });
  const [commissionForm, setCommissionForm] = useState({
    program_id: '',
    commission_type: 'percentage',
    commission_value: 0,
    is_active: true
  });
  const [accommodationForm, setAccommodationForm] = useState({
    accommodation_name: '',
    room_type: '',
    price_per_semester: 0,
    capacity: 0,
    available_spots: 0,
    amenities: [],
    is_active: true
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await loadInstitutionData(user.id);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutionData = async (userId: string) => {
    try {
      // Get institution linked to this admin user
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', userId)
        .single();

      if (!profile?.institution_id) {
        // If no institution, show setup form
        setInstitution(null);
        setLoading(false);
        return;
      }

      const institutionId = profile.institution_id;

      // Load institution details
      const { data: inst } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', institutionId)
        .single();
      setInstitution(inst);

      // Load programs
      const { data: progData } = await supabase
        .from('institution_programs')
        .select('*')
        .eq('institution_id', institutionId)
        .order('program_name');
      setPrograms(progData || []);

      // Load commissions
      const { data: commData } = await supabase
        .from('institution_commissions')
        .select('*')
        .eq('institution_id', institutionId);
      setCommissions(commData || []);

      // Load documents
      const { data: docData } = await supabase
        .from('institution_documents')
        .select('*')
        .eq('institution_id', institutionId);
      setDocuments(docData || []);

      // Load accommodations
      const { data: accData } = await supabase
        .from('institution_accommodation')
        .select('*')
        .eq('institution_id', institutionId);
      setAccommodations(accData || []);

      // Load applications (from leads linked to this institution)
      const { data: appData } = await supabase
        .from('leads')
        .select(`
          id,
          name,
          email,
          institution_applications!inner(application_status, submitted_at, admission_letter_url),
          institution_programs(program_name)
        `)
        .eq('institution_id', institutionId);
      
      const formattedApps = (appData || []).map((lead: any) => ({
        id: lead.institution_applications[0]?.id,
        lead_id: lead.id,
        lead_name: lead.name,
        lead_email: lead.email,
        program_name: lead.institution_programs?.program_name,
        application_status: lead.institution_applications[0]?.application_status,
        submitted_at: lead.institution_applications[0]?.submitted_at,
        admission_letter_url: lead.institution_applications[0]?.admission_letter_url,
      }));
      setApplications(formattedApps);

      // Load payment approvals
      const { data: payData } = await supabase
        .from('institution_payment_approvals')
        .select(`
          *,
          leads(name, email),
          student_payments(amount, proof_url)
        `)
        .eq('institution_id', institutionId);
      
      const formattedPayments = (payData || []).map((p: any) => ({
        id: p.id,
        lead_id: p.lead_id,
        lead_name: p.leads?.name,
        payment_id: p.payment_id,
        amount: p.student_payments?.amount,
        status: p.status,
        proof_url: p.student_payments?.proof_url,
        created_at: p.created_at,
      }));
      setPaymentApprovals(formattedPayments);

      // Load commission claims
      const { data: claimData } = await supabase
        .from('institution_commission_claims')
        .select(`
          *,
          leads(name),
          profiles(full_name)
        `)
        .eq('institution_id', institutionId);
      
      const formattedClaims = (claimData || []).map((c: any) => ({
        id: c.id,
        lead_id: c.lead_id,
        lead_name: c.leads?.name,
        recruiter_name: c.profiles?.full_name,
        commission_amount: c.commission_amount,
        status: c.status,
        claimed_at: c.claimed_at,
      }));
      setCommissionClaims(formattedClaims);

      // Calculate stats
      const totalLeads = appData?.length || 0;
      const totalApplications = formattedApps.length;
      const pendingApprovals = formattedPayments.filter(p => p.status === 'pending').length;
      const pendingCommissionClaims = formattedClaims.filter(c => c.status === 'pending').length;
      const totalCommissionPaid = formattedClaims.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0);
      
      setStats({
        totalLeads,
        totalApplications,
        pendingApprovals,
        totalCommissionPaid,
        pendingCommissionClaims,
        totalRevenue: 0 // calculate from payments
      });
    } catch (error) {
      console.error('Error loading institution data:', error);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string, leadId: string) => {
    try {
      await supabase
        .from('institution_applications')
        .update({
          application_status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', applicationId);

      // If approved, generate admission letter
      if (newStatus === 'approved') {
        try {
          const response = await fetch(`/api/generate-institution-acceptance-letter/${applicationId}`, {
            method: 'POST',
          });

          if (response.ok) {
            const result = await response.json();
            alert('Application approved and admission letter generated successfully!');
          } else {
            alert('Application approved but failed to generate admission letter.');
          }
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
          alert('Application approved but failed to generate admission letter.');
        }
      }

      loadInstitutionData(user.id);
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

  const handleApprovePayment = async (approvalId: string) => {
    try {
      await supabase
        .from('institution_payment_approvals')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', approvalId);
      
      alert('Payment approved successfully');
      loadInstitutionData(user.id);
    } catch (error) {
      console.error('Error approving payment:', error);
    }
  };

  const handleApproveCommissionClaim = async (claimId: string) => {
    try {
      await supabase
        .from('institution_commission_claims')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', claimId);
      
      alert('Commission claim approved');
      loadInstitutionData(user.id);
    } catch (error) {
      console.error('Error approving commission:', error);
    }
  };

  const handlePayCommission = async (claimId: string, amount: number) => {
    try {
      await supabase
        .from('institution_commission_claims')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', claimId);
      
      alert(`Commission of ZMW ${amount} marked as paid`);
      loadInstitutionData(user.id);
    } catch (error) {
      console.error('Error paying commission:', error);
    }
  };

  const handleAddProgram = async () => {
    if (!institution) return;
    try {
      const { error } = await supabase
        .from('institution_programs')
        .insert({
          institution_id: institution.id,
          ...programForm,
          fee_structure: programForm.fee_structure
        });
      
      if (error) throw error;
      
      alert('Program added successfully');
      setShowProgramModal(false);
      setProgramForm({
        program_code: '',
        program_name: '',
        description: '',
        duration: '',
        qualification_level: '',
        fee_structure: { tuition: 0, application_fee: 0 },
        intake_months: [],
        is_active: true
      });
      loadInstitutionData(user.id);
    } catch (error) {
      console.error('Error adding program:', error);
      alert('Failed to add program');
    }
  };

  const handleFileUpload = async (file: File, documentType: string, title: string) => {
    if (!institution) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${institution.id}-${Date.now()}.${fileExt}`;
      const filePath = `institution-documents/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('institution-files')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('institution-files')
        .getPublicUrl(filePath);
      
      await supabase
        .from('institution_documents')
        .insert({
          institution_id: institution.id,
          document_type: documentType,
          title: title,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id
        });
      
      alert('Document uploaded successfully');
      loadInstitutionData(user.id);
      setShowDocumentModal(false);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
      case 'pending_review':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"><Clock size={12} /> Pending</span>;
      case 'approved':
      case 'approved_payment':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"><AlertCircle size={12} /> Rejected</span>;
      case 'paid':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> Paid</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If no institution, show setup form
  if (!institution) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <h2 className="text-2xl font-bold text-center mb-4">Welcome to Institution Portal</h2>
          <p className="text-gray-600 text-center mb-6">Please contact the system administrator to link your account to an institution.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Main Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            {institution.logo_url && (
              <img src={institution.logo_url} alt={institution.institution_name} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{institution.institution_name}</h1>
              <p className="text-gray-600">Institution Dashboard – Manage recruitment, programs, and commissions</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold">{stats.totalLeads}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Applications</p>
                <p className="text-2xl font-bold">{stats.totalApplications}</p>
              </div>
              <FileCheck className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approvals</p>
                <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Commission Paid</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCommissionPaid)}</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex flex-wrap gap-2 overflow-x-auto">
            {['overview', 'programs', 'documents', 'accommodation', 'commissions', 'applications', 'payments', 'claims', 'communications', 'analytics', 'automations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-white text-blue-600 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <h2 className="text-lg font-semibold mb-4">Recent Applications</h2>
              <div className="space-y-3">
                {applications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{app.lead_name}</p>
                      <p className="text-xs text-gray-500">{app.program_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(app.application_status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border">
              <h2 className="text-lg font-semibold mb-4">Pending Commission Claims</h2>
              <div className="space-y-3">
                {commissionClaims.filter(c => c.status === 'pending').slice(0, 5).map((claim) => (
                  <div key={claim.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{claim.lead_name}</p>
                      <p className="text-xs text-gray-500">Recruiter: {claim.recruiter_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(claim.commission_amount)}</p>
                      <button
                        onClick={() => handleApproveCommissionClaim(claim.id)}
                        className="mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Programs Tab */}
        {activeTab === 'programs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Programs</h2>
              <button
                onClick={() => setShowProgramModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={18} /> Add Program
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((program) => (
                <div key={program.id} className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{program.program_name}</h3>
                      <p className="text-sm text-gray-500">{program.program_code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${program.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {program.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{program.description}</p>
                  <div className="mt-4 space-y-1 text-sm">
                    <p><span className="text-gray-500">Duration:</span> {program.duration}</p>
                    <p><span className="text-gray-500">Level:</span> {program.qualification_level}</p>
                    <p><span className="text-gray-500">Tuition:</span> {formatCurrency(program.fee_structure?.tuition || 0)}/year</p>
                    <p><span className="text-gray-500">Intakes:</span> {program.intake_months?.join(', ')}</p>
                  </div>
                  <button className="mt-4 text-sm text-blue-600 hover:text-blue-700">Edit</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Documents & Resources</h2>
              <button
                onClick={() => setShowDocumentModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Upload size={18} /> Upload Document
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white rounded-xl shadow-sm border p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-xs text-gray-400 capitalize">{doc.document_type}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={doc.file_url} target="_blank" className="p-2 text-gray-500 hover:text-blue-600">
                      <Eye size={18} />
                    </a>
                    <a href={doc.file_url} download className="p-2 text-gray-500 hover:text-green-600">
                      <Download size={18} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accommodation Tab */}
        {activeTab === 'accommodation' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Accommodation Options</h2>
              <button
                onClick={() => setShowAccommodationModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={18} /> Add Accommodation
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accommodations.map((acc) => (
                <div key={acc.id} className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-semibold text-lg">{acc.accommodation_name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{acc.room_type}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p><span className="text-gray-500">Price per semester:</span> {formatCurrency(acc.price_per_semester)}</p>
                    <p><span className="text-gray-500">Capacity:</span> {acc.capacity}</p>
                    <p><span className="text-gray-500">Available spots:</span> {acc.available_spots}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === 'commissions' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Commission Structure</h2>
              <button
                onClick={() => setShowCommissionModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={18} /> Add Commission Rule
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {commissions.map((comm) => {
                    const program = programs.find(p => p.id === comm.program_id);
                    return (
                      <tr key={comm.id}>
                        <td className="px-6 py-4">{program?.program_name || 'All Programs'}</td>
                        <td className="px-6 py-4 capitalize">{comm.commission_type}</td>
                        <td className="px-6 py-4">{comm.commission_type === 'percentage' ? `${comm.commission_value}%` : formatCurrency(comm.commission_value)}</td>
                        <td className="px-6 py-4">{comm.is_active ? 'Active' : 'Inactive'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium">{app.lead_name}</p>
                      <p className="text-xs text-gray-400">{app.lead_email}</p>
                    </td>
                    <td className="px-6 py-4">{app.program_name}</td>
                    <td className="px-6 py-4">{formatDate(app.submitted_at)}</td>
                    <td className="px-6 py-4">{getStatusBadge(app.application_status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {app.application_status === 'pending_review' && (
                          <>
                            <button
                              onClick={() => handleUpdateApplicationStatus(app.id, 'approved', app.lead_id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateApplicationStatus(app.id, 'rejected', app.lead_id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {app.admission_letter_url && (
                          <a href={app.admission_letter_url} target="_blank" className="text-blue-600 text-xs">Letter</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proof</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paymentApprovals.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4">{payment.lead_name}</td>
                    <td className="px-6 py-4 font-medium">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4">{formatDate(payment.created_at)}</td>
                    <td className="px-6 py-4">
                      {payment.proof_url && (
                        <a href={payment.proof_url} target="_blank" className="text-blue-600 text-sm">View</a>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                    <td className="px-6 py-4">
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => handleApprovePayment(payment.id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Claims Tab */}
        {activeTab === 'claims' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recruiter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissionClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="px-6 py-4">{claim.lead_name}</td>
                    <td className="px-6 py-4">{claim.recruiter_name}</td>
                    <td className="px-6 py-4 font-medium text-green-600">{formatCurrency(claim.commission_amount)}</td>
                    <td className="px-6 py-4">{formatDate(claim.claimed_at)}</td>
                    <td className="px-6 py-4">{getStatusBadge(claim.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {claim.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveCommissionClaim(claim.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handlePayCommission(claim.id, claim.commission_amount)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Mark Paid
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Communications Tab */}
        {activeTab === 'communications' && (
          <CommunicationsHub institutionId={user.id} />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard institutionId={user.id} />
        )}

        {/* Automations Tab */}
        {activeTab === 'automations' && (
          <AutomationEngine institutionId={user.id} />
        )}
      </div>

      {/* Add Program Modal */}
      {showProgramModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Program</h2>
              <button onClick={() => setShowProgramModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Program Code</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  value={programForm.program_code}
                  onChange={(e) => setProgramForm({...programForm, program_code: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Program Name</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  value={programForm.program_name}
                  onChange={(e) => setProgramForm({...programForm, program_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                  value={programForm.description}
                  onChange={(e) => setProgramForm({...programForm, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration</label>
                  <input
                    type="text"
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., 4 years"
                    value={programForm.duration}
                    onChange={(e) => setProgramForm({...programForm, duration: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Qualification Level</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={programForm.qualification_level}
                    onChange={(e) => setProgramForm({...programForm, qualification_level: e.target.value})}
                  >
                    <option value="">Select</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Bachelor">Bachelor</option>
                    <option value="Master">Master</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tuition Fee (ZMW)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={programForm.fee_structure.tuition}
                  onChange={(e) => setProgramForm({
                    ...programForm,
                    fee_structure: {...programForm.fee_structure, tuition: parseFloat(e.target.value)}
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Application Fee (ZMW)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={programForm.fee_structure.application_fee}
                  onChange={(e) => setProgramForm({
                    ...programForm,
                    fee_structure: {...programForm.fee_structure, application_fee: parseFloat(e.target.value)}
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Intake Months (comma separated)</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="January, May, September"
                  value={programForm.intake_months?.join(', ')}
                  onChange={(e) => setProgramForm({...programForm, intake_months: e.target.value.split(',').map(s => s.trim())})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowProgramModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProgram}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Program
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Upload Document</h2>
              <button onClick={() => setShowDocumentModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Document Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  id="docType"
                >
                  <option value="prospectus">Prospectus</option>
                  <option value="course_outline">Course Outline</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="brochure">Brochure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2"
                  id="docTitle"
                  placeholder="Document title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File</label>
                <input
                  type="file"
                  className="w-full border rounded-lg px-3 py-2"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const docType = (document.getElementById('docType') as HTMLSelectElement).value;
                      const docTitle = (document.getElementById('docTitle') as HTMLInputElement).value;
                      if (!docTitle) {
                        alert('Please enter a title');
                        return;
                      }
                      handleFileUpload(e.target.files[0], docType, docTitle);
                    }
                  }}
                />
              </div>
              {uploading && <p className="text-center text-sm text-gray-500">Uploading...</p>}
            </div>
          </div>
        </div>
      )}

      {/* Add Commission Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Commission Rule</h2>
              <button onClick={() => setShowCommissionModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Program</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={commissionForm.program_id}
                  onChange={(e) => setCommissionForm({...commissionForm, program_id: e.target.value})}
                >
                  <option value="">All Programs</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.program_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Commission Type</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={commissionForm.commission_type}
                  onChange={(e) => setCommissionForm({...commissionForm, commission_type: e.target.value as any})}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Value</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={commissionForm.commission_value}
                  onChange={(e) => setCommissionForm({...commissionForm, commission_value: parseFloat(e.target.value)})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCommissionModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!institution) return;
                    await supabase.from('institution_commissions').insert({
                      institution_id: institution.id,
                      ...commissionForm
                    });
                    alert('Commission rule added');
                    setShowCommissionModal(false);
                    loadInstitutionData(user.id);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}