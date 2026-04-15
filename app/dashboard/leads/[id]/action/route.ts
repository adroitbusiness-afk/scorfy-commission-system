import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { action, details } = await req.json();
  const { error } = await supabase.from('lead_activities').insert({
    lead_id: params.id,
    action_type: action,
    details,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}