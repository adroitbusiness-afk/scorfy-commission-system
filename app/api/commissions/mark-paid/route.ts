import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commission_id } = body || {};

    if (!commission_id) {
      return NextResponse.json({ error: 'commission_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', commission_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('commission mark-paid error:', error);
    return NextResponse.json({ error: error.message || 'Failed to mark commission paid' }, { status: 500 });
  }
}
