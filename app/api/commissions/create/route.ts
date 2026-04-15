import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead_id, amount = 500, recruiter_id, institution_id } = body || {};

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });
    }

    // Avoid duplicate commissions for the same lead
    const { data: existing } = await supabase
      .from('commissions')
      .select('id, status')
      .eq('student_id', lead_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, commission_id: existing.id, status: existing.status });
    }

    const { data, error } = await supabase
      .from('commissions')
      .insert({
        student_id: lead_id,
        recruiter_id: recruiter_id ?? null,
        institution_id: institution_id ?? null,
        amount,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id, status')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, commission_id: data.id, status: data.status });
  } catch (error: any) {
    console.error('commission create error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create commission' }, { status: 500 });
  }
}
