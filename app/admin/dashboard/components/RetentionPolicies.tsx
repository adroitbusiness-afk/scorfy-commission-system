'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Save, Trash2 } from 'lucide-react';

export default function RetentionPolicies() {
  const [policies, setPolicies] = useState<any[]>([]);
  useEffect(() => { fetchPolicies(); }, []);
  const fetchPolicies = async () => { const { data } = await supabase.from('retention_policies').select('*'); setPolicies(data || []); };
  const updatePolicy = async (table: string, days: number, enabled: boolean) => { await supabase.from('retention_policies').upsert({ table_name: table, retention_days: days, enabled }); fetchPolicies(); };
  const runCleanup = async (table: string) => { if (confirm(`Delete old records from ${table}?`)) { await fetch('/api/admin/retention/cleanup', { method: 'POST', body: JSON.stringify({ table }) }); alert('Cleanup triggered'); } };
  return (<div className="bg-white p-6 rounded shadow"><h2 className="text-xl font-bold mb-4">Data Retention Policies</h2><div className="space-y-3">{policies.map(p => (<div key={p.table_name} className="flex items-center gap-3 p-2 border rounded"><span className="w-32 font-mono">{p.table_name}</span><input type="number" value={p.retention_days} onChange={e => updatePolicy(p.table_name, parseInt(e.target.value), p.enabled)} className="w-20 border p-1 rounded" /><span>days</span><button onClick={() => updatePolicy(p.table_name, p.retention_days, !p.enabled)} className={`px-2 py-1 rounded text-sm ${p.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{p.enabled ? 'Enabled' : 'Disabled'}</button><button onClick={() => runCleanup(p.table_name)} className="text-red-600"><Trash2 className="w-4 h-4" /></button></div>))}</div><p className="text-sm text-gray-500 mt-4">Define how long data is kept. Cleanup runs daily via a scheduled job.</p></div>);
}