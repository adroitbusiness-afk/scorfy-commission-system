'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function NDAPage() {
  const router = useRouter();
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/signup');
      else setUser(user);
    });
  }, []);

  const handleSubmit = async () => {
    if (!agreed || !signature) {
      alert('Please agree and provide your full name as signature');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('recruiter_nda').insert({
      recruiter_id: user.id,
      signed_name: signature,
      ip_address: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip),
      user_agent: navigator.userAgent,
    });
    if (error) alert('Failed to save agreement: ' + error.message);
    else router.push('/recruiter/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900">Recruiter Non-Disclosure Agreement</h1>
        <div className="border rounded-lg p-4 my-6 h-80 overflow-y-auto text-sm text-gray-700 bg-gray-50">
          <p className="font-bold mb-2">NON-DISCLOSURE AGREEMENT</p>
          <p>This Non-Disclosure Agreement (the "Agreement") is entered into between <strong>Global Smart Student Recruitment</strong> ("Company") and the undersigned recruiter ("Recruiter").</p>
          <p className="mt-2"><strong>1. Confidential Information:</strong> Recruiter agrees to keep all lead data, commission structures, platform algorithms, and any proprietary information strictly confidential.</p>
          <p className="mt-2"><strong>2. Non-Circumvention:</strong> Recruiter shall not directly contact institutions or students bypassing the platform for any commercial purpose.</p>
          <p className="mt-2"><strong>3. Data Protection:</strong> Recruiter shall not share, sell, rent, or misuse any lead data obtained through the platform.</p>
          <p className="mt-2"><strong>4. Term:</strong> This agreement remains in effect during the recruiter's account activity and for two years after termination.</p>
          <p className="mt-2"><strong>5. Breach:</strong> Any breach may result in immediate account termination, forfeiture of commissions, and legal action.</p>
          <p className="mt-2"><strong>6. Governing Law:</strong> This agreement is governed by the laws of Zambia.</p>
          <p className="mt-4 text-center">By signing below, you acknowledge that you have read, understood, and agree to be bound by this NDA.</p>
        </div>

        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-5 h-5 text-blue-600" />
          <span className="text-gray-700">I have read and agree to the terms of this Non-Disclosure Agreement</span>
        </label>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name (Legal Signature)</label>
          <input
            type="text"
            placeholder="Type your full name"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Your typed name serves as your electronic signature.</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !agreed || !signature}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : 'Accept & Continue to Dashboard'}
        </button>
      </div>
    </div>
  );
}