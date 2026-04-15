import { Mail, MessageCircle, Phone, Share2 } from 'lucide-react';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
type LeadAction = 'call' | 'whatsapp' | 'email';
type SharePlatform = 'whatsapp' | 'twitter' | 'facebook';

interface LeadData {
  id: string;
  name: string;
  program?: string | null;
  lead_score?: number | null;
  referral_code: string;
  status: LeadStatus;
}

interface LeadCardProps {
  lead: LeadData;
  onAction: (lead: LeadData, action: LeadAction) => void;
  onStatusChange: (leadId: string, status: string) => void;
}

function LeadCard({ lead, onAction, onStatusChange }: LeadCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 text-green-400';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  const handleShare = (platform: SharePlatform) => {
    const url = `https://yourdomain.com/referral/${lead.referral_code}`;
    const text = `Join me on this program! Use my referral link: ${url}`;
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 hover:border-blue-500 transition">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{lead.name}</h3>
          <p className="text-xs text-gray-400">{lead.program || 'No program'}</p>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs ${getScoreColor(lead.lead_score || 0)}`}>
          Score: {lead.lead_score || 0}
        </div>
      </div>
      <div className="mt-2 flex gap-2 flex-wrap">
        <button onClick={() => onAction(lead, 'call')} className="p-1.5 bg-gray-700 rounded hover:bg-gray-600" title="Call">
          <Phone size={14} />
        </button>
        <button onClick={() => onAction(lead, 'whatsapp')} className="p-1.5 bg-green-500/20 rounded hover:bg-green-500/30 text-green-400" title="WhatsApp">
          <MessageCircle size={14} />
        </button>
        <button onClick={() => onAction(lead, 'email')} className="p-1.5 bg-blue-500/20 rounded hover:bg-blue-500/30 text-blue-400" title="Email">
          <Mail size={14} />
        </button>
        <button onClick={() => handleShare('whatsapp')} className="p-1.5 bg-gray-700 rounded hover:bg-gray-600" title="Share referral link">
          <Share2 size={14} />
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-400">
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value)}
          className="bg-gray-700/50 border border-gray-600 rounded px-1 py-0.5"
        >
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="converted">Converted</option>
          <option value="lost">Lost</option>
        </select>
      </div>
    </div>
  );
}

export default LeadCard;
