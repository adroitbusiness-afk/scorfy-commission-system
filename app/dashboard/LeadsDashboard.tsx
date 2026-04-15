'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Upload, Search, Download, Send, X } from 'lucide-react';
import LeadItem from './LeadItem';

interface Props {
  recruiterId?: string;   // if provided, only show leads assigned to this recruiter
  isAdmin?: boolean;
  onAddLead: () => void;
  onAIImport: () => void;
}

export default function LeadsDashboard({ recruiterId, isAdmin, onAddLead, onAIImport }: Props) {
  const [leads, setLeads] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [currentLead, setCurrentLead] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [prefilledMessage, setPrefilledMessage] = useState('');

  useEffect(() => {
    fetchLeads();
    fetchRecruiters();
  }, [recruiterId]);

  async function fetchLeads() {
    setLoading(true);
    try {
      let query = supabase.from('leads').select('*, recruiter:assigned_recruiter(name, email)');
      if (recruiterId) {
        query = query.eq('assigned_recruiter', recruiterId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecruiters() {
    const { data } = await supabase.from('recruiters').select('*');
    setRecruiters(data || []);
  }

  async function updateLeadStatus(leadId: string, newStatus: string, message: string) {
    try {
      // Update status in DB
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;

      // Log the action
      await supabase.from('communication_logs').insert({
        lead_id: leadId,
        type: 'status_change',
        message: `Status changed to ${newStatus}${message ? '. Message: ' + message : ''}`,
      });

      // If status is converted, add commission (optional)
      if (newStatus === 'converted') {
        await supabase.from('leads').update({ commission: 1000 }).eq('id', leadId);
      }

      fetchLeads(); // refresh
    } catch (error) {
      console.error(error);
      alert('Failed to update lead status');
    }
  }

  // Open modal with pre-filled message based on status
  const openStatusModal = (lead: any, status: string) => {
    let message = '';
    if (status === 'contacted') {
      message = `Hello ${lead.name},\n\nThank you for your interest in our programs. I'd like to schedule a quick call to discuss your goals and see how we can help. When would be a good time?\n\nBest regards,\n[Your Name]`;
    } else if (status === 'qualified') {
      message = `Hi ${lead.name},\n\nGreat news! Based on our conversation, you qualify for our [program name]. I've attached the enrollment information. Let me know if you have any questions.\n\nCheers,\n[Your Name]`;
    } else if (status === 'converted') {
      message = `Congratulations ${lead.name}!\n\nWelcome to the [program name]! Your enrollment is confirmed. Here are your next steps...\n\nBest,\n[Your Name]`;
    } else {
      message = `Hi ${lead.name},\n\nI wanted to follow up regarding your interest in our programs. Let me know if you have any questions.\n\nThanks,\n[Your Name]`;
    }
    setCurrentLead(lead);
    setNewStatus(status);
    setPrefilledMessage(message);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (currentLead && newStatus) {
      await updateLeadStatus(currentLead.id, newStatus, prefilledMessage);
      setShowStatusModal(false);
      setCurrentLead(null);
      setNewStatus('');
      setPrefilledMessage('');
    }
  };

  const filteredLeads = useMemo(() => {
    let filtered = [...leads];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q)
      );
    }
    return filtered;
  }, [leads, statusFilter, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const toggleSelectLead = (id: string) => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLeadIds(newSet);
  };

  const exportLeads = () => {
    if (filteredLeads.length === 0) {
      alert('No leads to export');
      return;
    }
    const csvRows = [
      ['Name', 'Email', 'Phone', 'Status', 'Created At', 'Assigned Recruiter', 'Notes', 'Lead Score'],
      ...filteredLeads.map(lead => [
        lead.name,
        lead.email,
        lead.phone,
        lead.status,
        new Date(lead.created_at).toLocaleDateString(),
        recruiters.find(r => r.id === lead.assigned_recruiter)?.name || '',
        lead.notes?.replace(/,/g, ';') || '',
        lead.lead_score || '',
      ]),
    ];
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Leads Management</h2>
        <div className="flex gap-2">
          <button onClick={onAddLead} className="px-4 py-2 bg-blue-600 rounded-lg flex items-center gap-2">
            <Plus size={18} /> Add Lead
          </button>
          <button onClick={onAIImport} className="px-4 py-2 bg-purple-600 rounded-lg flex items-center gap-2">
            <Upload size={18} /> AI Import
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-gray-800 rounded-lg px-3 py-2 flex-1 border border-gray-700"
        />
        <div className="flex gap-2">
          <button onClick={exportLeads} className="px-3 py-2 bg-green-600 rounded-lg flex items-center gap-1">
            <Download size={16} /> Export
          </button>
          {selectedLeadIds.size > 0 && (
            <button onClick={() => {/* bulk delete */}} className="px-3 py-2 bg-red-600 rounded-lg">
              Delete ({selectedLeadIds.size})
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div>Loading leads...</div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(lead => (
            <LeadItem
              key={lead.id}
              lead={lead}
              recruiters={recruiters}
              isSelected={selectedLeadIds.has(lead.id)}
              onSelect={toggleSelectLead}
              onUpdateStatus={(_id: string, status: string) => openStatusModal(lead, status)}
              onAssign={(_lead: any) => {}}
              onScheduleFollowup={(_lead: any, _date: string) => {}}
              onAddNotes={(_lead: any, _notes: string) => {}}
              onExportSingle={() => {}}
            />
          ))}
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && currentLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Update Lead Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
            </div>
            <p className="text-gray-300 mb-2">Lead: <strong>{currentLead.name}</strong></p>
            <p className="text-gray-300 mb-4">New Status: <span className="font-semibold text-blue-400">{newStatus}</span></p>
            <label className="block text-sm text-gray-400 mb-2">Message (will be logged)</label>
            <textarea
              value={prefilledMessage}
              onChange={(e) => setPrefilledMessage(e.target.value)}
              rows={6}
              className="w-full bg-gray-700 rounded-lg p-3 text-sm"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">Cancel</button>
              <button onClick={handleStatusUpdate} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Send size={16} /> Update & Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
