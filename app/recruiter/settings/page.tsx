'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function RecruiterSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', user_id: '' });
  const [requestMessage, setRequestMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) router.push('/login');
      const { data } = await supabase.from('recruiters').select('*').eq('user_id', user?.id).single();
      setProfile(data);
    });
  }, []);

  const updateProfile = async () => {
    setLoading(true);
    await supabase.from('recruiters').update({ name: profile.name, phone: profile.phone }).eq('user_id', profile.user_id);
    alert('Profile updated');
    setLoading(false);
  };

  const requestAdmissionEdit = async () => {
    if (!requestMessage) return;
    await supabase.from('recruiter_requests').insert({
      recruiter_id: profile.user_id,
      type: 'admission_letter_edit',
      message: requestMessage,
    });
    alert('Request sent to admin');
    setRequestMessage('');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Recruiter Settings</h1>
      <div className="space-y-4">
        <div><label className="block font-medium">Name</label><input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full p-2 border rounded" /></div>
        <div><label className="block font-medium">Email</label><input value={profile.email} disabled className="w-full p-2 border rounded bg-gray-100" /></div>
        <div><label className="block font-medium">Phone</label><input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full p-2 border rounded" /></div>
        <button onClick={updateProfile} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">Save Changes</button>

        <hr className="my-6" />
        <h2 className="text-xl font-semibold mb-2">Request Admission Letter Edit</h2>
        <textarea value={requestMessage} onChange={e => setRequestMessage(e.target.value)} rows={4} className="w-full p-2 border rounded" placeholder="Describe what needs to be changed..."></textarea>
        <button onClick={requestAdmissionEdit} className="bg-yellow-600 text-white px-4 py-2 rounded">Submit Request</button>
      </div>
    </div>
  );
}