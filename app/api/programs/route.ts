import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAccessibleInstitutionIds } from '@/lib/roleUtils';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const instIds = await getAccessibleInstitutionIds();
  let query = supabase.from('programs').select('*');
  if (instIds.length) query = query.in('institution_id', instIds);
  const { data } = await query;
  return NextResponse.json(data);
}