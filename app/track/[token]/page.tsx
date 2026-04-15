import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import TrackingClient from './TrackingClient';

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from('student_applications')
    .select('*, institutions(*), institution_programs(*)')
    .eq('tracking_token', token)
    .single();

  if (error || !application) {
    notFound();
  }

  return <TrackingClient application={application} />;
}