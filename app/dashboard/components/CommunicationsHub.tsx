'use client';

import { useState, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  Users,
  UserCheck,
  Bookmark,
  Clock,
  BarChart3,
} from 'lucide-react';

interface Message {
  id: string;
  title: string;
  message: string;
  audience_type: string;
  channel: string;
  recipient_count: number;
  sent_at: string;
}

interface Analytics {
  totalMessages: number;
  totalRecipients: number;
  byChannel: { email: number; sms: number; whatsapp: number };
  byAudience: Record<string, number>;
}

export default function CommunicationsHub({ institutionId }: { institutionId: string }) {
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'templates'>('send');
  const [messages, setMessages] = useState<Message[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);

  // Send form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    audienceType: 'all',
    channel: 'email',
    programId: '',
    intake: '',
  });

  const commissionTemplates = {
    admission_followup: {
      title: 'Application Status Update',
      message: 'Thank you for applying! Your application is being reviewed. We will notify you soon.',
    },
    payment_reminder: {
      title: 'Payment Reminder - Secure Your Place',
      message: 'Congratulations on your acceptance! Please complete your semester fee payment to confirm enrollment.',
    },
    offer_letter: {
      title: 'Congratulations - Your Offer Letter',
      message: 'We are delighted to offer you admission to our program. Download your acceptance letter above.',
    },
    deadline_alert: {
      title: 'Important: Application Deadline',
      message: 'The application deadline is approaching. Submit your application before the deadline to be considered.',
    },
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/communications/messages/${institutionId}`);
      const data = await res.json();

      if (data.success) {
        setMessages(data.messages);
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/communications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId,
          title: formData.title,
          message: formData.message,
          audienceType: formData.audienceType,
          channel: formData.channel,
          programId: formData.programId || undefined,
          intake: formData.intake || undefined,
        }),
      });

      const result = await res.json();

      if (result.success) {
        alert(`Message sent to ${result.sentCount} recipients!`);
        setFormData({
          title: '',
          message: '',
          audienceType: 'all',
          channel: 'email',
          programId: '',
          intake: '',
        });
        fetchMessages();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: keyof typeof commissionTemplates) => {
    const tmpl = commissionTemplates[template];
    setFormData(prev => ({
      ...prev,
      title: tmpl.title,
      message: tmpl.message,
    }));
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail size={16} />;
      case 'sms':
        return <Phone size={16} />;
      case 'whatsapp':
        return <MessageCircle size={16} />;
      default:
        return <MessageSquare size={16} />;
    }
  };

  const getAudienceLabel = (type: string) => {
    const labels: Record<string, string> = {
      all: 'All Leads',
      applicants: 'Applicants',
      accepted: 'Accepted Students',
      by_program: 'By Program',
      by_intake: 'By Intake',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalMessages}</p>
              </div>
              <MessageSquare className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reached</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalRecipients}</p>
              </div>
              <Users className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.byChannel.email}</p>
              </div>
              <Mail className="text-orange-500" size={32} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.byChannel.whatsapp}</p>
              </div>
              <MessageCircle className="text-green-600" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        {(['send', 'history', 'templates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'send' && 'Send Message'}
            {tab === 'history' && 'Message History'}
            {tab === 'templates' && 'Templates'}
          </button>
        ))}
      </div>

      {/* Send Message Tab */}
      {activeTab === 'send' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
          <form onSubmit={handleSendBroadcast} className="space-y-4">
            {/* Message Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Payment Reminder for K500 Semester Fee"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Content
              </label>
              <textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                placeholder="Your message here... Use personalization: {name}, {email}, etc."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Audience Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={formData.audienceType}
                  onChange={e => setFormData({ ...formData, audienceType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Leads</option>
                  <option value="applicants">Applicants</option>
                  <option value="accepted">Accepted Students</option>
                  <option value="by_program">By Program</option>
                  <option value="by_intake">By Intake</option>
                </select>
              </div>

              {/* Channel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel
                </label>
                <select
                  value={formData.channel}
                  onChange={e => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>
            </div>

            {/* Filters */}
            {formData.audienceType === 'by_program' && (
              <input
                type="text"
                placeholder="Program ID (optional)"
                value={formData.programId}
                onChange={e => setFormData({ ...formData, programId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}

            {formData.audienceType === 'by_intake' && (
              <input
                type="text"
                placeholder="Intake (e.g., Jan 2026)"
                value={formData.intake}
                onChange={e => setFormData({ ...formData, intake: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {loading ? 'Sending...' : 'Send Broadcast'}
            </button>
          </form>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No messages sent yet.
            </div>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getChannelIcon(msg.channel)}
                      <h3 className="font-semibold text-gray-900">{msg.title}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {getAudienceLabel(msg.audience_type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{msg.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {msg.recipient_count} recipients
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(msg.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(commissionTemplates).map(([key, template]) => (
            <div
              key={key}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 cursor-pointer transition"
              onClick={() => applyTemplate(key as keyof typeof commissionTemplates)}
            >
              <h3 className="font-semibold text-gray-900 mb-2">{template.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{template.message}</p>
              <button className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">
                Use Template
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}