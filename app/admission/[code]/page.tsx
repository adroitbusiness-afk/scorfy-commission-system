import { supabase } from '@/lib/supabase/client';
import LandingClient from './LandingClient';

interface AdmissionPageProps {
  params: Promise<{ code: string }>;
}

export default async function AdmissionLandingPage({ params }: AdmissionPageProps) {
  const { code } = await params;
  const referralCode = code?.toString().toUpperCase();

  if (!referralCode) {
    return <div className="min-h-screen flex items-center justify-center text-center p-6">Referral code is missing.</div>;
  }

  try {
    const { error } = await supabase.rpc('increment_referral_click', { ref_code: referralCode });
    if (error) {
      console.error('Referral landing track error:', error);
    }
  } catch (err) {
    console.error('Referral landing track error:', err);
  }

  return <LandingClient referralCode={referralCode} />;
}
