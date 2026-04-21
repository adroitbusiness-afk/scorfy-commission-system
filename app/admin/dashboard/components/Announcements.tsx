'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Edit, Trash2, Megaphone } from 'lucide-react';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  useEffect(() => { fetchAnnouncements(); }, []);
  const fetchAnnouncements = async () => { const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }); setAnnouncements(data || []); };
  const add = async () => { const title = prompt('Title:'); const message = prompt('Message:'); if (title && message) { await supabase.from('announcements').insert({ title, message, is_active: true }); fetchAnnouncements(); } };
  const toggle = async (id: string, active: boolean) => { await supabase.from('announcements').update({ is_active: active }).eq('id', id); fetchAnnouncements(); };
  const del = async (id: string) => { if (confirm('Delete?')) { await supabase.from('announcements').delete().eq('id', id); fetchAnnouncements(); } };
  return (<div className="bg-white p-6 rounded shadow"><div className="flex justify-between"><h2 className="text-xl font-bold">Announcements</h2><button onClick={add} className="bg-blue-600 text-white px-3 py-1 rounded flex gap-1"><Plus className="w-4 h-4" /> New</button></div><div className="mt-4 space-y-3">{announcements.map(a => (<div key={a.id} className="border p-3 rounded"><div className="flex justify-between"><h3 className="font-semibold">{a.title}</h3><div className="flex gap-2"><button onClick={() => toggle(a.id, !a.is_active)} className={`px-2 py-0.5 rounded text-xs ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{a.is_active ? 'Active' : 'Inactive'}</button><button onClick={() => del(a.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button></div></div><p className="text-sm text-gray-600 mt-1">{a.message}</p><p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleString()}</p></div>))}</div></div>);
}