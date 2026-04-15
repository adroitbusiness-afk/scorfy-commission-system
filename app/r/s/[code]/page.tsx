import { supabase } from '@/lib/supabaseClient';
import { redirect } from 'next/navigation';

export default async function StudentShortLinkPage({ params }: { params: { code: string } }) {
  const { data } = await supabase
    .from('student_short_links')
    .select('long_url')
    .eq('short_code', params.code)
    .single();

  if (data?.long_url) {
    // Increment click count (optional)
    await supabase.rpc('increment_student_short_link_clicks', { code: params.code });
    redirect(data.long_url);
  } else {
    redirect('/');
  }
}