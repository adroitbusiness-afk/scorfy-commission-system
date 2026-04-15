import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POINTS = {
  click: 2,
  engagement: 5,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code: string | undefined = body?.code;
    const event: 'click' | 'engagement' = body?.event || 'click';

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    const { data: recruiter, error } = await supabase
      .from('recruiters')
      .select('id')
      .eq('referral_code', code)
      .single();

    if (error || !recruiter) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 404 });
    }

    const points = POINTS[event] || POINTS.click;

    await supabase.from('reward_points').insert({
      recruiter_id: recruiter.id,
      points,
      reason: `share_${event}`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, points });
  } catch (err: any) {
    console.error('reward track error', err);
    return NextResponse.json({ error: err.message || 'Failed to track reward' }, { status: 500 });
  }
}

