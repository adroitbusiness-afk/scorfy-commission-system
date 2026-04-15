'use client';

import { memo, useState } from 'react';
import { Download, MoreVertical, Mail, Phone, Calendar, Edit2, Trash2, UserCheck, CheckCircle, XCircle, UserPlus } from 'lucide-react';

const LeadItem = memo(({ lead, recruiters, isSelected, onSelect, onUpdateStatus, onAssign, onScheduleFollowup, onAddNotes, onExportSingle }: any) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-400';
      case 'contacted': return 'bg-yellow-500/20 text-yellow-400';
      case 'qualified': return 'bg-purple-500/20 text-purple-400';
      case 'converted': return 'bg-green-500/20 text-green-400';
      case 'lost': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex items-start gap-4">
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(lead.id)} className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{lead.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(lead.status)}`}>{lead.status}</span>
            {lead.lead_score && <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">Score: {lead.lead_score}</span>}
          </div>
          <div className="text-sm text-gray-400 space-y-1">
            <p>{lead.email}</p>
            <p>{lead.phone}</p>
            {lead.program && <p>Program: {lead.program}</p>}
            {lead.mode_of_study && <p>Mode: {lead.mode_of_study}</p>}
            {lead.intake && <p>Intake: {lead.intake}</p>}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowActions(!showActions)} className="p-1 hover:bg-gray-700 rounded">
            <MoreVertical size={18} />
          </button>
          {showActions && (
            <div className="absolute right-0 top-8 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 py-1">
              <button onClick={() => onUpdateStatus(lead.id, 'contacted')} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"><Mail size={14} /> Mark Contacted</button>
              <button onClick={() => onUpdateStatus(lead.id, 'qualified')} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"><UserCheck size={14} /> Mark Qualified</button>
              <button onClick={() => onUpdateStatus(lead.id, 'converted')} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"><CheckCircle size={14} /> Mark Converted</button>
              <button onClick={() => onUpdateStatus(lead.id, 'lost')} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"><XCircle size={14} /> Mark Lost</button>
              <hr className="my-1 border-gray-700" />
              <button onClick={() => onAssign(lead)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"><UserPlus size={14} /> Assign Recruiter</button>
              <button onClick={() => onScheduleFollowup(lead)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"><Calendar size={14} /> Schedule Follow-up</button>
              <button onClick={() => onAddNotes(lead)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"><Edit2 size={14} /> Add Notes</button>
              <button onClick={() => onExportSingle(lead)} className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"><Download size={14} /> Export</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

LeadItem.displayName = 'LeadItem';
export default LeadItem;
