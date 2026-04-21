'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Edit } from 'lucide-react';

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  useEffect(() => { fetchTemplates(); }, []);
  const fetchTemplates = async () => { const { data } = await supabase.from('email_templates').select('*'); setTemplates(data || []); };
  const saveTemplate = async (name: string) => { await supabase.from('email_templates').update({ content: editContent }).eq('name', name); setEditing(null); fetchTemplates(); };
  return (<div className="bg-white p-6 rounded shadow"><h2 className="text-xl font-bold mb-4">Email Templates</h2><div className="space-y-4">{templates.map(t => (<div key={t.name} className="border p-3 rounded"><div className="flex justify-between items-center"><h3 className="font-semibold">{t.name}</h3><button onClick={() => { setEditing(t.name); setEditContent(t.content); }} className="text-blue-600"><Edit className="w-4 h-4" /></button></div>{editing === t.name ? (<div><textarea rows={6} value={editContent} onChange={e => setEditContent(e.target.value)} className="w-full border p-2 rounded mt-2 font-mono text-sm" /><button onClick={() => saveTemplate(t.name)} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded flex gap-1"><Save className="w-4 h-4" /> Save</button></div>) : (<p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{t.content}</p>)}</div>))}</div></div>);
}