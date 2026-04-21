'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Plus, Save } from 'lucide-react';

export default function FeatureFlags() {
  const [flags, setFlags] = useState<any[]>([]);
  const fetchFlags = async () => { const { data } = await supabase.from('feature_flags').select('*'); setFlags(data || []); };
  useEffect(() => { fetchFlags(); }, []);
  const updateFlag = async (name: string, enabled: boolean) => { await supabase.from('feature_flags').upsert({ name, enabled, updated_at: new Date() }); fetchFlags(); };
  const addFlag = async () => { const name = prompt('Feature flag name:'); if (name) await supabase.from('feature_flags').insert({ name, enabled: false }); fetchFlags(); };
  return (<div className="bg-white p-6 rounded shadow"><div className="flex justify-between"><h2 className="text-xl font-bold">Feature Flags</h2><button onClick={addFlag} className="bg-green-600 text-white px-3 py-1 rounded flex gap-1"><Plus className="w-4 h-4" /> Add Flag</button></div><div className="mt-4 space-y-2">{flags.map(f => (<div key={f.name} className="flex justify-between items-center border-b py-2"><span className="font-mono">{f.name}</span><Switch checked={f.enabled} onCheckedChange={val => updateFlag(f.name, val)} /></div>))}</div><p className="text-sm text-gray-500 mt-4">Use these flags to enable/disable features without deploying code.</p></div>);
}