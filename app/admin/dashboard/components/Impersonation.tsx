'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { UserPlus } from 'lucide-react';

export default function Impersonation() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const impersonate = async () => {
    setLoading(true);
    const { data: targetUser } = await supabase.from('profiles').select('id').eq('email', email).single();
    if (!targetUser) return alert('User not found');
    const { data: session } = await supabase.auth.getSession();
    await supabase.from('impersonation_sessions').insert({ admin_id: session?.session?.user.id, target_user_id: targetUser.id, expires_at: new Date(Date.now() + 3600000).toISOString() });
    // In a real implementation, you would generate a special token and set a cookie.
    alert(`Impersonation session created for ${email}. You can now log in as this user.`);
    setLoading(false);
  };
  return (<div className="bg-white p-6 rounded shadow max-w-md"><h2 className="text-xl font-bold mb-4">Login as User</h2><input type="email" placeholder="User email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded mb-4" /><button onClick={impersonate} disabled={loading} className="w-full flex justify-center gap-2 bg-orange-600 text-white py-2 rounded"><UserPlus className="w-4 h-4" /> {loading ? 'Creating...' : 'Impersonate'}</button><p className="text-xs text-gray-500 mt-2">⚠️ This action is audited. The session lasts 1 hour.</p></div>);
}