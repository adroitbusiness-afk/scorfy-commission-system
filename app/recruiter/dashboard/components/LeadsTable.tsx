'use client';

import { useMemo } from 'react';
import {
  MessageCircle,
  Mail,
  Phone,
  CheckSquare,
  Square,
} from 'lucide-react';
import { AnalyzedLead } from '@/lib/aiLeadEngine';
import {
  getIntentIcon,
  getPriorityColor,
  getStatusBadge,
} from '../utils';

interface LeadsTableProps {
  paginatedLeads: AnalyzedLead[];
  selectedLeads: Set<string>;
  loading: boolean;
  onToggleSelect: (leadId: string) => void;
  onToggleSelectAll: () => void;
  onSendWhatsApp: (lead: AnalyzedLead) => void;
  onSendEmail: (lead: AnalyzedLead) => void;
  onMakeCall: (lead: AnalyzedLead) => void;
  onUpdateStatus: (leadId: string, status: string) => void;
  filteredLeadsCount: number;
}

export default function LeadsTable({
  paginatedLeads,
  selectedLeads,
  loading,
  onToggleSelect,
  onToggleSelectAll,
  onSendWhatsApp,
  onSendEmail,
  onMakeCall,
  onUpdateStatus,
  filteredLeadsCount,
}: LeadsTableProps) {
  const isAllSelected = useMemo(() => {
    return (
      selectedLeads.size === paginatedLeads.length && paginatedLeads.length > 0
    );
  }, [selectedLeads.size, paginatedLeads.length]);

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' },
  ];

  const nextStepText = {
    new: '📝 Fill Form',
    contacted: '📎 Upload Docs',
    qualified: '💰 Pay Deposit',
    converted: '✅ Enrolled',
    lost: '❌ Lost',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={onToggleSelectAll}
                  className="flex items-center gap-1 hover:bg-gray-200 p-1 rounded"
                  title="Select all"
                >
                  {isAllSelected ? (
                    <CheckSquare size={16} className="text-blue-600" />
                  ) : (
                    <Square size={16} className="text-gray-400" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Lead
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                AI Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Intent
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Next Step
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedLeads.has(lead.id!)}
                    onChange={() => onToggleSelect(lead.id!)}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-gray-900">{lead.name}</p>
                  <p className="text-xs text-gray-400">ID: {lead.id?.slice(0, 8)}</p>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  <div>{lead.email}</div>
                  <div className="text-xs text-gray-500">
                    {lead.phone || 'No phone'}
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                    {lead.score || 0}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="flex items-center gap-1 text-sm capitalize">
                    {getIntentIcon(lead.intent)}
                    <span className="hidden sm:inline">
                      {lead.intent.replace(/_/g, ' ')}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(
                      lead.priority
                    )}`}
                  >
                    {lead.priority}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <select
                    value={lead.status}
                    onChange={(e) => onUpdateStatus(lead.id!, e.target.value)}
                    className={`text-xs border rounded px-2 py-1 bg-white font-medium transition ${getStatusBadge(
                      lead.status
                    )}`}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-4 text-sm font-medium text-gray-700">
                  {nextStepText[lead.status as keyof typeof nextStepText] ||
                    'Pending'}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-1 justify-center flex-wrap">
                    <button
                      onClick={() => onSendWhatsApp(lead)}
                      className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                      title="Send WhatsApp"
                      aria-label="Send WhatsApp message"
                    >
                      <MessageCircle size={14} />
                    </button>
                    <button
                      onClick={() => onSendEmail(lead)}
                      className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                      title="Send Email"
                      aria-label="Send email"
                    >
                      <Mail size={14} />
                    </button>
                    {lead.phone && lead.phone.startsWith('260') && (
                      <button
                        onClick={() => onMakeCall(lead)}
                        className="p-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition"
                        title="Make Call"
                        aria-label="Make phone call"
                      >
                        <Phone size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginatedLeads.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  <p className="font-medium">No leads found</p>
                  <p className="text-sm">Try adjusting your filters or search terms</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
