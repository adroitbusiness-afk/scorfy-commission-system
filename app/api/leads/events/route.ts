import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead_id, recruiter_id, event_type, payload } = body || {};

    if (!lead_id || !event_type) {
      return NextResponse.json({ error: 'lead_id and event_type are required' }, { status: 400 });
    }

    const { error } = await supabase.from('lead_events').insert({
      lead_id,
      recruiter_id: recruiter_id ?? null,
      event_type,
      payload: payload ? JSON.stringify(payload) : null,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('lead_events error:', error);
    return NextResponse.json({ error: error.message || 'Failed to log event' }, { status: 500 });
  }
}
