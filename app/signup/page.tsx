'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Eye, EyeOff, UserPlus, Loader2, CheckCircle, Building2 } from 'lucide-react';

type SignupRole = 'student' | 'recruiter' | 'affiliate';

function SignupContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<SignupRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralCode(ref);
      if (typeof window !== 'undefined') {
        localStorage.setItem('dmdbc_referral_code', ref);
      }
    }
  }, [searchParams]);

  // Fetch institutions once and reuse locally
  useEffect(() => {
    setLoadingInstitutions(true);
    supabase
      .from('institutions')
      .select('id, institution_name, institution_code')
      .eq('status', 'active')
      .order('institution_name')
      .then(({ data, error }) => {
        if (!error && data) setInstitutions(data);
        setLoadingInstitutions(false);
      });
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError('Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
      setError('Invalid phone number. Use 10-15 digits, optional + prefix.');
      return;
    }
    if (selectedRole === 'affiliate' && !selectedInstitution) {
      setError('Please select an institution');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let referredByUserId: string | null = null;
      if (referralCode) {
        const { data: refUser, error: refError } = await supabase
          .from('recruiters')
          .select('user_id')
          .eq('referral_code', referralCode)
          .maybeSingle();

        if (refError) throw refError;
        referredByUserId = refUser?.user_id || null;
      }

      const campaign = searchParams.get('utm_campaign');

      // Sign up user with metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: selectedRole,
            institution_id: selectedInstitution || null,
            referred_by: referredByUserId,
            signup_source: 'signup_page',
            campaign: campaign || null,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Signup failed - no user returned');

      const userId = authData.user.id;

      // Complete profile/recruiter/lead with service role to bypass RLS
      const completeRes = await fetch('/api/signup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          role: selectedRole,
          full_name: fullName,
          email,
          phone,
          institution_id: selectedInstitution || null,
          referred_by: referredByUserId,
          referral_code: referralCode || null,
        }),
      });
      if (!completeRes.ok) {
        const txt = await completeRes.text().catch(() => '');
        let msg = 'Failed to finalize signup';
        try {
          const data = JSON.parse(txt);
          msg = data.error || msg;
        } catch {
          msg = txt || msg;
        }
        throw new Error(msg);
      }

      alert('Account created successfully! Please check your email to confirm if required.');
      if (!authData.session) {
        router.push('/login?checkEmail=1');
      } else if (selectedRole === 'student') {
        router.push('/student/dashboard');
      } else if (selectedRole === 'recruiter') {
        router.push('/signup/nda');
      } else if (selectedRole === 'affiliate') {
        router.push('/affiliate/dashboard');
      } else {
        router.push('/login');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: Array<{ value: SignupRole; label: string; description: string }> = [
    { value: 'student', label: 'Student', description: 'Apply to programs, track applications' },
    { value: 'recruiter', label: 'Recruiter', description: 'Earn commissions by recruiting students' },
    { value: 'affiliate', label: 'Affiliate', description: 'Promote programs and earn rewards' },
  ];

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case 'student': return '🎓';
      case 'recruiter': return '🤝';
      case 'affiliate': return '🔗';
      default: return '👤';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Join the DMBDC ecosystem</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">At least 6 characters</p>
                </div>
              </div>

              {referralCode && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-blue-900">
                  Referred by code: <span className="font-semibold">{referralCode}</span>. This referral will be kept with your account.
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I am signing up as *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        selectedRole === role.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getRoleIcon(role.value)}</span>
                        <div>
                          <p className="font-medium text-gray-800">{role.label}</p>
                          <p className="text-xs text-gray-400">{role.description}</p>
                        </div>
                        {selectedRole === role.value && <CheckCircle className="ml-auto text-blue-500" size={16} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Institution Selection */}
              {selectedRole === 'affiliate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Institution *</label>
                  {loadingInstitutions ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading institutions...
                    </div>
                  ) : institutions.length > 0 ? (
                    <select
                      value={selectedInstitution}
                      onChange={(e) => setSelectedInstitution(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Select an institution --</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.institution_name} ({inst.institution_code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-red-500 text-sm">No active institutions found. Contact administrator.</p>
                  )}
                </div>
              )}

              {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" /> Sign Up
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
