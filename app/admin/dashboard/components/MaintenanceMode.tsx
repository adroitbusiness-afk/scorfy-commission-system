'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';

export default function MaintenanceMode() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').single().then(({ data }) => {
      if (data) { setEnabled(data.value.enabled); setMessage(data.value.message); }
    });
  }, []);
  const save = async () => {
    await supabase.from('system_settings').upsert({ key: 'maintenance_mode', value: { enabled, message }, updated_at: new Date() });
    alert('Maintenance mode updated');
  };
  return (<div className="bg-white p-6 rounded shadow max-w-xl"><h2 className="text-xl font-bold mb-4">Maintenance Mode</h2><div className="flex justify-between items-center mb-4"><span>Enable maintenance mode</span><Switch checked={enabled} onCheckedChange={setEnabled} /></div><textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} className="w-full border rounded p-2" placeholder="Message shown to users during downtime" /><button onClick={save} className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"><Save className="w-4 h-4" /> Save</button><p className="text-sm text-gray-500 mt-2">When enabled, non‑admin users will be redirected to a maintenance page. Admins can still access the dashboard.</p></div>);
}