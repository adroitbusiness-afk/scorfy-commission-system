'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

export default function InstitutionSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    institution_name: '',
    institution_code: '',
    phone: '',
    address: '',
    website: '',
  });
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementLoading, setAgreementLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { role: 'institution_admin' } }
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('User creation failed');

      // 2. Create institution record
      const { data: institution, error: instError } = await supabase
        .from('institutions')
        .insert({
          institution_name: form.institution_name,
          institution_code: form.institution_code,
          email: form.email,
          phone: form.phone,
          address: form.address,
          website: form.website,
          created_by: authData.user.id,
          settings: { timezone: 'Africa/Lusaka', currency: 'ZMW' }
        })
        .select()
        .single();
      if (instError) throw instError;

      // 3. Add user as team member (admin)
      const { error: teamError } = await supabase
        .from('institution_team_members')
        .insert({
          institution_id: institution.id,
          user_id: authData.user.id,
          role: 'admin',
          permissions: { all: true }
        });
      if (teamError) throw teamError;

      // 4. Update profile with institution_id
      await supabase
        .from('profiles')
        .update({ institution_id: institution.id, role: 'institution_admin' })
        .eq('id', authData.user.id);

      toast.success('Institution registered! Please review and sign the agreement.');
      setShowAgreement(true);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signAgreement = async () => {
    setAgreementLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();
      if (!profile?.institution_id) throw new Error('Institution not found');

      const res = await fetch('/api/institution/agreement/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_id: profile.institution_id })
      });
      if (!res.ok) throw new Error('Failed to sign agreement');
      toast.success('Agreement signed successfully!');
      router.push('/institution/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAgreementLoading(false);
    }
  };

  const downloadAgreement = () => {
    // Generate and download a blank agreement for preview
    window.open('/api/institution/agreement/preview', '_blank');
  };

  if (showAgreement) {
    return <AgreementModal onAccept={signAgreement} onDownload={downloadAgreement} loading={agreementLoading} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Register Your Institution</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Admin Email" required className="w-full p-3 border rounded-lg"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input type="password" placeholder="Password" required className="w-full p-3 border rounded-lg"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <input type="text" placeholder="Institution Name" required className="w-full p-3 border rounded-lg"
            value={form.institution_name} onChange={e => setForm({...form, institution_name: e.target.value})} />
          <input type="text" placeholder="Institution Code (e.g., UNZA)" required className="w-full p-3 border rounded-lg"
            value={form.institution_code} onChange={e => setForm({...form, institution_code: e.target.value})} />
          <input type="tel" placeholder="Phone" className="w-full p-3 border rounded-lg"
            value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <input type="text" placeholder="Address" className="w-full p-3 border rounded-lg"
            value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          <input type="url" placeholder="Website" className="w-full p-3 border rounded-lg"
            value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Agreement Modal Component
function AgreementModal({ onAccept, onDownload, loading }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Institution Subscription Agreement</h2>
        <div className="border rounded-lg p-4 mb-6 h-80 overflow-y-auto text-sm text-gray-700 bg-gray-50">
          <h3 className="font-bold">1. Definitions</h3>
          <p>...</p>
          <h3 className="font-bold mt-4">3. Fees & Payment Terms</h3>
          <p>Base monthly subscription (includes 3 Users): <strong>K3,900</strong></p>
          <p>Additional User (beyond the first 3): <strong>K490</strong> per user/month</p>
          <p>First 30 days: Free trial</p>
          {/* Add full agreement text here - same as previous */}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onDownload} className="px-4 py-2 border rounded-lg">Download Copy</button>
          <button onClick={onAccept} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            {loading ? 'Saving...' : 'I Agree & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}