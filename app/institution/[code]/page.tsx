import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import InstitutionLandingClient from './InstitutionLandingClient';

export default async function InstitutionLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  // Fetch institution by code
  const { data: institution, error } = await supabase
    .from('institutions')
    .select('*, institution_programs(*)')
    .eq('institution_code', code.toUpperCase())
    .single();

  if (error || !institution) {
    notFound();
  }

  return <InstitutionLandingClient institution={institution} />;
}