'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Key, Plus, Copy, Trash2 } from 'lucide-react';

export default function ApiKeys() {
  const [keys, setKeys] = useState<any[]>([]);
  useEffect(() => { fetchKeys(); }, []);
  const fetchKeys = async () => { const { data } = await supabase.from('api_keys').select('*'); setKeys(data || []); };
  const generateKey = async () => { const name = prompt('Key name:'); if (name) { await supabase.from('api_keys').insert({ name, key: crypto.randomUUID(), created_at: new Date() }); fetchKeys(); } };
  const revokeKey = async (id: string) => { if (confirm('Revoke this key?')) { await supabase.from('api_keys').delete().eq('id', id); fetchKeys(); } };
  return (<div className="bg-white p-6 rounded shadow"><div className="flex justify-between"><h2 className="text-xl font-bold">API Keys</h2><button onClick={generateKey} className="bg-green-600 text-white px-3 py-1 rounded flex gap-1"><Plus className="w-4 h-4" /> Generate Key</button></div><div className="mt-4 space-y-3">{keys.map(k => (<div key={k.id} className="flex justify-between items-center border p-3 rounded"><div><div className="font-medium">{k.name}</div><div className="text-xs font-mono text-gray-500">{k.key}</div><div className="text-xs">Created: {new Date(k.created_at).toLocaleDateString()}</div></div><button onClick={() => revokeKey(k.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></button></div>))}</div><p className="text-sm text-gray-500 mt-4">API keys are used for external integrations. Keep them secret.</p></div>);
}