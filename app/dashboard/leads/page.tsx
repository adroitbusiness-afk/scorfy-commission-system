'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import {
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  FileText,
  X,
  CheckCircle,
  Clock,
  Star,
  RefreshCw,
  Upload,
  Users,
} from 'lucide-react';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  lead_score?: number;
  notes?: string;
  last_contacted?: string;
  next_followup?: string;
  created_at: string;
  source?: string;
  program?: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [actionType, setActionType] = useState<'call' | 'whatsapp' | 'email' | null>(null);
  const [callScript, setCallScript] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkWhatsappSending, setIsBulkWhatsappSending] = useState(false);

  // Quick add form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Fetch leads
  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Error loading leads:', error);
    else setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadLeads();
  }, []);

  // Add lead
  const addLead = async () => {
    if (!name.trim() || !phone.trim()) {
      alert('Please enter both name and phone');
      return;
    }
    const { error } = await supabase.from('leads').insert({
      name,
      phone,
      source: 'Manual',
      status: 'new',
    });
    if (error) {
      console.error('Error adding lead:', error);
      alert('Failed to add lead');
    } else {
      setName('');
      setPhone('');
      loadLeads();
    }
  };

  // Helper: generate script/message based on lead and action type
  const generateContent = (lead: Lead, type: 'call' | 'whatsapp' | 'email') => {
    const firstName = lead.name.split(' ')[0];
    if (type === 'call') {
      return `Hello ${firstName}, this is [Your Name] from [Institution Name]. I'm following up on your application for ${lead.program || 'our programs'}. Do you have a few minutes to discuss?`;
    } else if (type === 'whatsapp') {
      return `Hi ${firstName}, this is [Your Name] from [Institution Name]. We received your inquiry about our programs. I'd love to answer any questions you have. Let me know a convenient time to chat.`;
    } else {
      return `Hi ${firstName},\n\nThank you for your interest in our programs. I'd like to schedule a quick call to discuss your goals and how we can help.\n\nWhen would be a good time to connect?\n\nBest,\n[Your Name]`;
    }
  };

  // Update lead status (with auto follow‑up)
  const updateStatus = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      // Update lead status
      const { error: statusError } = await supabase
        .from('leads')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (statusError) throw statusError;

      // Create follow‑up based on new status
      if (newStatus === 'contacted') {
        const followupDate = new Date();
        followupDate.setDate(followupDate.getDate() + 2);
        await supabase.from('followups').insert({
          lead_id: leadId,
          type: 'call',
          scheduled_date: followupDate.toISOString().split('T')[0],
          message: 'Follow‑up call to discuss program details',
          status: 'pending',
        });
        await supabase.from('communication_logs').insert({
          lead_id: leadId,
          type: 'note',
          message: `Status changed to contacted. Follow‑up call scheduled for ${followupDate.toLocaleDateString()}`,
        });
      } else if (newStatus === 'qualified') {
        const followupDate = new Date();
        followupDate.setDate(followupDate.getDate() + 5);
        await supabase.from('followups').insert({
          lead_id: leadId,
          type: 'email',
          scheduled_date: followupDate.toISOString().split('T')[0],
          message: 'Send enrollment information',
          status: 'pending',
        });
        await supabase.from('communication_logs').insert({
          lead_id: leadId,
          type: 'note',
          message: `Status changed to qualified. Email follow‑up scheduled for ${followupDate.toLocaleDateString()}`,
        });
      }

      // If status becomes 'converted', set commission
      if (newStatus === 'converted') {
        await supabase.from('leads').update({ commission: 1000 }).eq('id', leadId);
        await supabase.from('communication_logs').insert({
          lead_id: leadId,
          type: 'note',
          message: 'Lead converted. Commission of K1000 assigned.',
        });
      }

      loadLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Failed to update lead status');
    }
  };

  // Record action (call, whatsapp, email)
  const recordAction = async (leadId: string, action: 'call' | 'whatsapp' | 'email', script?: string) => {
    const now = new Date().toISOString();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Log communication
    await supabase.from('communication_logs').insert({
      lead_id: leadId,
      type: action,
      message: `${action.toUpperCase()} script: ${script?.substring(0, 100)}...`,
    });

    // Update last_contacted and possibly status
    const newStatus = lead.status === 'new' ? 'contacted' : lead.status;
    await supabase
      .from('leads')
      .update({
        status: newStatus,
        last_contacted: now,
        updated_at: now,
      })
      .eq('id', leadId);

    loadLeads();
  };

  // Schedule follow-up (with optional Google Calendar stub)
  const scheduleFollowup = async (leadId: string, date: string) => {
    if (!date) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    // Update lead's next_followup
    const { error } = await supabase
      .from('leads')
      .update({ next_followup: date, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    if (error) {
      console.error('Error scheduling follow-up:', error);
      alert('Failed to schedule follow-up');
      return;
    }

    // Create follow‑up record
    await supabase.from('followups').insert({
      lead_id: leadId,
      type: 'call',
      scheduled_date: date,
      message: `Follow‑up call scheduled for ${date}`,
      status: 'pending',
    });

    // (Optional) Google Calendar integration – stub
    // You can call an API endpoint here if you implement it.
    alert(`Follow-up scheduled for ${date}`);
    loadLeads();
  };

  // Add manual note
  const addNote = async (leadId: string, note: string) => {
    if (!note.trim()) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const updatedNotes = lead.notes ? `${lead.notes}\n${note}` : note;
    const { error } = await supabase
      .from('leads')
      .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    if (error) console.error('Error adding note:', error);
    else loadLeads();
    setManualNote('');
  };

  // Bulk WhatsApp messaging (opens tabs with 20‑second delay)
  const sendBulkWhatsApp = async () => {
    if (selectedLeadIds.size === 0) {
      alert('No leads selected');
      return;
    }
    const leadsArray = leads.filter(lead => selectedLeadIds.has(lead.id));
    const message = prompt('Enter the message to send via WhatsApp:', 'Hello, this is a follow‑up regarding your application. Are you available for a quick call?');
    if (!message) return;

    setIsBulkWhatsappSending(true);
    for (let i = 0; i < leadsArray.length; i++) {
      const lead = leadsArray[i];
      const phone = lead.phone.replace(/\D/g, '');
      if (!phone) {
        alert(`Lead ${lead.name} has no phone number. Skipping.`);
        continue;
      }
      const encodedMsg = encodeURIComponent(message);
      const url = `https://wa.me/${phone}?text=${encodedMsg}`;
      setTimeout(() => {
        window.open(url, '_blank');
      }, i * 20000); // 20 seconds
    }
    alert(`Sending WhatsApp to ${leadsArray.length} leads (one every 20 seconds).`);
    setIsBulkWhatsappSending(false);
  };

  // Toggle selection for a lead
  const toggleSelectLead = (id: string) => {
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLeadIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map(lead => lead.id)));
    }
  };

  // Action modal
  const openActionModal = (lead: Lead, type: 'call' | 'whatsapp' | 'email') => {
    setSelectedLead(lead);
    setActionType(type);
    if (type === 'email') {
      const firstName = lead.name.split(' ')[0];
      const subject = `Follow-up: ${lead.program || 'Your Application'}`;
      const body = generateContent(lead, type);
      setCallScript(body);
      setEmailSubject(subject);
    } else {
      setCallScript(generateContent(lead, type));
      setEmailSubject('');
    }
  };

  const closeModal = () => {
    setSelectedLead(null);
    setActionType(null);
    setCallScript('');
    setEmailSubject('');
  };

  const executeAction = async () => {
    if (!selectedLead || !actionType) return;

    if (actionType === 'whatsapp') {
      const phone = selectedLead.phone.replace(/\D/g, '');
      if (phone) {
        const encodedMsg = encodeURIComponent(callScript);
        window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
      } else {
        alert('No phone number for this lead');
      }
    } else if (actionType === 'email') {
      const subject = encodeURIComponent(emailSubject);
      const body = encodeURIComponent(callScript);
      window.open(`mailto:${selectedLead.email}?subject=${subject}&body=${body}`, '_blank');
    }
    // For call, just log the action
    await recordAction(selectedLead.id, actionType, callScript);
    closeModal();
  };

  // Helper: status badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'contacted': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'qualified': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'converted': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'lost': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock size={14} />;
      case 'contacted': return <Phone size={14} />;
      case 'qualified': return <Star size={14} />;
      case 'converted': return <CheckCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">🔥 Lead Management</h1>
          <div className="flex gap-2">
            <button
              onClick={loadLeads}
              className="p-2 bg-gray-800/50 rounded-lg border border-gray-700 hover:bg-gray-700/50"
              title="Refresh"
            >
              <RefreshCw size={18} className="text-gray-400" />
            </button>
            {/* Bulk WhatsApp button (appears only when leads are selected) */}
            {selectedLeadIds.size > 0 && (
              <button
                onClick={sendBulkWhatsApp}
                disabled={isBulkWhatsappSending}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg hover:bg-green-500/30 text-green-400 transition"
              >
                <MessageCircle size={18} />
                <span className="hidden sm:inline">Bulk WhatsApp ({selectedLeadIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick add form */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-700/50">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name"
              className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Phone"
              className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 flex-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              onClick={addLead}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-medium hover:shadow-lg transition"
            >
              Add Lead
            </button>
          </div>
        </div>

        {/* Leads List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-800/50 rounded-xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-700/50">
            <Users size={48} className="mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium mb-2">No leads yet</h3>
            <p className="text-gray-400">Start by adding a lead or importing from CSV.</p>
          </div>
        ) : (
          <>
            {/* Select All checkbox */}
            <div className="flex justify-end items-center gap-2 mb-2">
              <button
                onClick={toggleSelectAll}
                className="text-sm text-gray-400 hover:text-white"
              >
                {selectedLeadIds.size === leads.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-3">
              {leads.map(lead => (
                <div
                  key={lead.id}
                  className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {/* Checkbox */}
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={() => toggleSelectLead(lead.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold">{lead.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h3 className="font-medium truncate">{lead.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                            <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span className={`px-2 py-0.5 rounded-full border ${getStatusColor(lead.status)} inline-flex items-center gap-1`}>
                              {getStatusIcon(lead.status)}
                              {lead.status}
                            </span>
                            {lead.lead_score && (
                              <>
                                <span>•</span>
                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Score: {lead.lead_score}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-500" />
                          <span className="truncate">{lead.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-500" />
                          <span>{lead.phone || 'No phone'}</span>
                        </div>
                      </div>
                      {lead.notes && (
                        <div className="mt-2 text-xs text-gray-400 bg-gray-800/30 p-2 rounded-lg">
                          <p className="line-clamp-2">{lead.notes}</p>
                        </div>
                      )}
                      {lead.next_followup && (
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <Calendar size={12} className="text-gray-500" />
                          <span className="text-gray-400">Follow-up: </span>
                          <span className="text-blue-400">{new Date(lead.next_followup).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => openActionModal(lead, 'call')}
                        className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
                        title="Call with script"
                      >
                        <Phone size={18} />
                      </button>
                      <button
                        onClick={() => openActionModal(lead, 'whatsapp')}
                        className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition text-green-400"
                        title="WhatsApp"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button
                        onClick={() => openActionModal(lead, 'email')}
                        className="p-2 bg-blue-500/20 rounded-lg hover:bg-blue-500/30 transition text-blue-400"
                        title="Email"
                      >
                        <Mail size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const date = prompt('Enter follow-up date (YYYY-MM-DD):');
                          if (date) scheduleFollowup(lead.id, date);
                        }}
                        className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
                        title="Schedule Follow-up"
                      >
                        <Calendar size={18} />
                      </button>
                      <button
                        onClick={() => {
                          const note = prompt('Add note:');
                          if (note) addNote(lead.id, note);
                        }}
                        className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
                        title="Add Note"
                      >
                        <FileText size={18} />
                      </button>
                      {/* Status dropdown */}
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value as Lead['status'])}
                        className="bg-gray-700/50 border border-gray-600 rounded-lg px-2 py-1 text-sm"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Action Modal (Call/WhatsApp/Email) */}
      <AnimatePresence>
        {selectedLead && actionType && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={closeModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">
                    {actionType === 'call' ? 'Call Script' : actionType === 'whatsapp' ? 'WhatsApp Message' : 'Email Draft'}
                  </h2>
                  <button onClick={closeModal} className="p-1 hover:bg-gray-700 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                {actionType === 'email' && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-2 text-white"
                    />
                  </div>
                )}
                <textarea
                  value={callScript}
                  onChange={(e) => setCallScript(e.target.value)}
                  rows={6}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={executeAction}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-medium hover:shadow-lg transition"
                  >
                    {actionType === 'call' ? 'Log Call' : actionType === 'whatsapp' ? 'Open WhatsApp' : 'Open Email'}
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 bg-gray-700/50 rounded-lg font-medium hover:bg-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}