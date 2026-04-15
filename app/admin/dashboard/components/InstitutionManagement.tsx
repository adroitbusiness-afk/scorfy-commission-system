'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Building2,
  Search,
  Edit,
  Trash2,
  Plus,
  Eye,
  CheckCircle,
  RefreshCw,
  Download,
  Info,
  Mail,
  Phone,
  Globe,
  MapPin,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  X,
} from 'lucide-react';

interface Institution {
  id: string;
  institution_code: string;
  institution_name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo_url: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  created_at: string;
  updated_at: string;
  user_id: string;
  total_applications?: number;
  total_revenue?: number;
  active_recruiters?: number;
  conversion_rate?: number;
}

export default function InstitutionManagement() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [institutionForm, setInstitutionForm] = useState<Partial<Institution>>({
    institution_code: '',
    institution_name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo_url: '',
    status: 'pending',
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchInstitutions();
  }, [searchTerm, statusFilter]);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('institutions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchTerm) {
        query = query.or(`institution_name.ilike.%${searchTerm}%,institution_code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Compute stats using direct queries (avoid RPC that may not exist)
      const institutionsWithStats = await Promise.all(
        (data || []).map(async (inst) => {
          // Count leads (applications)
          const { count: applications } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('institution_id', inst.id);

          // Sum revenue from student_payments (adjust table name as needed)
          let revenue = 0;
          try {
            const { data: payments } = await supabase
              .from('student_payments')
              .select('amount')
              .eq('institution_id', inst.id)
              .eq('status', 'verified');
            revenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          } catch (err) {
            console.warn('Revenue calculation failed, using 0', err);
          }

          // Count active recruiters
          const { count: recruiters } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('institution_id', inst.id)
            .eq('role', 'recruiter')
            .eq('status', 'active');

          return {
            ...inst,
            total_applications: applications || 0,
            total_revenue: revenue,
            active_recruiters: recruiters || 0,
            conversion_rate: applications ? Math.round(((applications * 0.15) / applications) * 100) : 0, // example placeholder
          };
        })
      );

      setInstitutions(institutionsWithStats);
    } catch (error) {
      console.error('Failed to fetch institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateInstitutionStatus = async (institutionId: string, newStatus: Institution['status']) => {
    try {
      setActionLoading(institutionId);
      const { error } = await supabase
        .from('institutions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', institutionId);
      if (error) throw error;
      await fetchInstitutions();
    } catch (error) {
      console.error('Failed to update institution status:', error);
      alert('Failed to update institution status');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteInstitution = async (institutionId: string) => {
    if (!confirm('Delete this institution? All related data will be affected.')) return;
    try {
      setActionLoading(institutionId);
      const { error } = await supabase.from('institutions').delete().eq('id', institutionId);
      if (error) throw error;
      await fetchInstitutions();
    } catch (error) {
      console.error('Failed to delete institution:', error);
      alert('Failed to delete institution');
    } finally {
      setActionLoading(null);
    }
  };

  const openInstitutionForm = (institution?: Institution) => {
    if (institution) {
      setInstitutionForm({
        id: institution.id,
        institution_code: institution.institution_code,
        institution_name: institution.institution_name,
        email: institution.email,
        phone: institution.phone,
        address: institution.address,
        website: institution.website,
        logo_url: institution.logo_url,
        status: institution.status,
      });
      setIsEditMode(true);
    } else {
      setInstitutionForm({
        institution_code: '',
        institution_name: '',
        email: '',
        phone: '',
        address: '',
        website: '',
        logo_url: '',
        status: 'pending',
      });
      setIsEditMode(false);
    }
    setErrorMessage(null);
    setShowInstitutionModal(true);
  };

  const saveInstitution = async () => {
    // Validate required fields
    if (!institutionForm.institution_name || !institutionForm.institution_code || !institutionForm.email) {
      setErrorMessage('Institution name, code, and email are required.');
      return;
    }

    try {
      setActionLoading('save');
      setErrorMessage(null);

      const payload: any = {
        institution_code: institutionForm.institution_code?.trim(),
        institution_name: institutionForm.institution_name?.trim(),
        email: institutionForm.email?.trim(),
        phone: institutionForm.phone?.trim() || null,
        address: institutionForm.address?.trim() || null,
        website: institutionForm.website?.trim() || null,
        logo_url: institutionForm.logo_url?.trim() || null,
        status: institutionForm.status || 'pending',
        updated_at: new Date().toISOString(),
      };

      if (isEditMode && institutionForm.id) {
        const { error } = await supabase
          .from('institutions')
          .update(payload)
          .eq('id', institutionForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('institutions')
          .insert([{ ...payload, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      setShowInstitutionModal(false);
      await fetchInstitutions();
    } catch (error: any) {
      console.error('Supabase error:', error);
      setErrorMessage(error?.message || 'Failed to save institution. Please check the form and try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || colors.pending;
  };

  const exportInstitutions = () => {
    const csv = [
      ['Code', 'Name', 'Email', 'Phone', 'Status', 'Applications', 'Revenue', 'Recruiters', 'Created'].join(','),
      ...institutions.map(inst => [
        inst.institution_code,
        inst.institution_name,
        inst.email,
        inst.phone || '',
        inst.status,
        inst.total_applications || 0,
        inst.total_revenue || 0,
        inst.active_recruiters || 0,
        new Date(inst.created_at).toLocaleDateString(),
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `institutions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Institution Management</h2>
          <p className="text-gray-600">Manage educational institutions and their performance</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => openInstitutionForm()}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Institution</span>
          </button>
          <button
            onClick={exportInstitutions}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={fetchInstitutions}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-600">Total Institutions</p><p className="text-2xl font-bold">{institutions.length}</p></div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-600">Active Institutions</p><p className="text-2xl font-bold">{institutions.filter(i => i.status === 'active').length}</p></div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-600">Total Applications</p><p className="text-2xl font-bold">{institutions.reduce((s, i) => s + (i.total_applications || 0), 0)}</p></div>
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-600">Total Revenue</p><p className="text-2xl font-bold">K{institutions.reduce((s, i) => s + (i.total_revenue || 0), 0).toLocaleString()}</p></div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input type="text" placeholder="Search institutions..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
          <div className="text-sm text-gray-600 flex items-center"><Info className="w-4 h-4 mr-2" />{institutions.length} institutions found</div>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" /><p>Loading...</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {institutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-lg bg-gray-300 flex items-center justify-center">
                          {inst.logo_url ? <img src={inst.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <Building2 className="w-5 h-5 text-gray-600" />}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium">{inst.institution_name}</div>
                          <div className="text-xs text-gray-500">Code: {inst.institution_code}</div>
                          {inst.website && <div className="text-xs text-blue-600"><a href={inst.website} target="_blank" rel="noopener noreferrer">{inst.website}</a></div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm"><Mail className="inline w-3 h-3 mr-1" />{inst.email}</div>
                      {inst.phone && <div className="text-sm"><Phone className="inline w-3 h-3 mr-1" />{inst.phone}</div>}
                      {inst.address && <div className="text-sm"><MapPin className="inline w-3 h-3 mr-1" />{inst.address.substring(0, 30)}</div>}
                    </td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(inst.status)}`}>{inst.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="text-sm"><FileText className="inline w-4 h-4 mr-1" />{inst.total_applications || 0} apps</div>
                      <div className="text-sm"><DollarSign className="inline w-4 h-4 mr-1" />K{inst.total_revenue || 0}</div>
                      <div className="text-sm"><Users className="inline w-4 h-4 mr-1" />{inst.active_recruiters || 0} recruiters</div>
                    </td>
                    <td className="px-6 py-4 text-sm"><Calendar className="inline w-4 h-4 mr-1" />{new Date(inst.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex space-x-2">
                        <select value={inst.status} onChange={(e) => updateInstitutionStatus(inst.id, e.target.value as any)} className="text-xs border rounded px-2 py-1">
                          <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option><option value="pending">Pending</option>
                        </select>
                        <button onClick={() => openInstitutionForm(inst)} className="text-indigo-600 hover:text-indigo-900"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setSelectedInstitution(inst)} className="text-blue-600 hover:text-blue-900"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => deleteInstitution(inst.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {institutions.length === 0 && !loading && (
          <div className="p-8 text-center"><Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium">No institutions found</h3></div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showInstitutionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{isEditMode ? 'Edit Institution' : 'Add Institution'}</h3>
              <button onClick={() => setShowInstitutionModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {errorMessage && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{errorMessage}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">Institution Name *</label><input type="text" value={institutionForm.institution_name || ''} onChange={(e) => setInstitutionForm({...institutionForm, institution_name: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium">Institution Code *</label><input type="text" value={institutionForm.institution_code || ''} onChange={(e) => setInstitutionForm({...institutionForm, institution_code: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium">Email *</label><input type="email" value={institutionForm.email || ''} onChange={(e) => setInstitutionForm({...institutionForm, email: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium">Phone</label><input type="text" value={institutionForm.phone || ''} onChange={(e) => setInstitutionForm({...institutionForm, phone: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium">Website</label><input type="url" value={institutionForm.website || ''} onChange={(e) => setInstitutionForm({...institutionForm, website: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="https://" /></div>
                <div><label className="block text-sm font-medium">Logo URL</label><input type="url" value={institutionForm.logo_url || ''} onChange={(e) => setInstitutionForm({...institutionForm, logo_url: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium">Address</label><textarea rows={2} value={institutionForm.address || ''} onChange={(e) => setInstitutionForm({...institutionForm, address: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium">Status</label><select value={institutionForm.status} onChange={(e) => setInstitutionForm({...institutionForm, status: e.target.value as any})} className="w-full p-2 border rounded-lg"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option><option value="pending">Pending</option></select></div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowInstitutionModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={saveInstitution} disabled={actionLoading === 'save'} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {actionLoading === 'save' ? 'Saving...' : 'Save Institution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedInstitution && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full">
            <div className="p-6 border-b flex justify-between items-center"><h3 className="text-xl font-bold">Institution Details</h3><button onClick={() => setSelectedInstitution(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Name:</strong> {selectedInstitution.institution_name}</div>
                <div><strong>Code:</strong> {selectedInstitution.institution_code}</div>
                <div><strong>Email:</strong> {selectedInstitution.email}</div>
                <div><strong>Phone:</strong> {selectedInstitution.phone || 'N/A'}</div>
                <div><strong>Website:</strong> {selectedInstitution.website || 'N/A'}</div>
                <div><strong>Address:</strong> {selectedInstitution.address || 'N/A'}</div>
                <div><strong>Status:</strong> <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedInstitution.status)}`}>{selectedInstitution.status}</span></div>
                <div><strong>Created:</strong> {new Date(selectedInstitution.created_at).toLocaleDateString()}</div>
                <div><strong>Applications:</strong> {selectedInstitution.total_applications || 0}</div>
                <div><strong>Revenue:</strong> K{selectedInstitution.total_revenue || 0}</div>
                <div><strong>Active Recruiters:</strong> {selectedInstitution.active_recruiters || 0}</div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end"><button onClick={() => setSelectedInstitution(null)} className="px-4 py-2 bg-gray-300 rounded-lg">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}