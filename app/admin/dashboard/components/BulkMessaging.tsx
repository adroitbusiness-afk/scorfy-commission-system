'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Send } from 'lucide-react';

export default function BulkMessaging() {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState('email');
  const [sending, setSending] = useState(false);
  const send = async () => {
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('bulk_messages').insert({ subject, content, channel, recipient_filter: { role: 'user' }, created_by: session?.user.id });
    alert('Message queued for delivery');
    setSending(false);
  };
  return (<div className="bg-white p-6 rounded shadow max-w-2xl"><h2 className="text-xl font-bold mb-4">Bulk Messaging</h2><input placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border p-2 rounded mb-3" /><textarea rows={5} placeholder="Message content" value={content} onChange={e => setContent(e.target.value)} className="w-full border p-2 rounded mb-3" /><select value={channel} onChange={e => setChannel(e.target.value)} className="w-full border p-2 rounded mb-3"><option value="email">Email</option><option value="sms">SMS</option></select><button onClick={send} disabled={sending} className="w-full bg-blue-600 text-white py-2 rounded flex justify-center gap-2"><Send className="w-4 h-4" /> {sending ? 'Queuing...' : 'Queue Message'}</button></div>);
}