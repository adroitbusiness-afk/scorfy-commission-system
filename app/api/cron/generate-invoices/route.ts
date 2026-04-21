import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get all active institutions
  const { data: institutions } = await supabaseAdmin
    .from('institutions')
    .select('id, settings');

  if (!institutions || institutions.length === 0) {
    return NextResponse.json({ success: true, message: 'No institutions found' });
  }

  for (const inst of institutions) {
    // Count active users (from team_members)
    const { count } = await supabaseAdmin
      .from('institution_team_members')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', inst.id);

    const additionalUsers = Math.max(0, (count || 0) - 3);
    const additionalFee = additionalUsers * 490;
    const total = 3900 + additionalFee;

    // Check if invoice already exists for this month
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: existing } = await supabaseAdmin
      .from('institution_invoices')
      .select('id')
      .eq('institution_id', inst.id)
      .gte('period_start', periodStart.toISOString())
      .maybeSingle();

    if (!existing) {
      const invoiceNumber = `INV-${inst.id.slice(0,6)}-${now.getFullYear()}${now.getMonth()+1}`;
      await supabaseAdmin.from('institution_invoices').insert({
        institution_id: inst.id,
        invoice_number: invoiceNumber,
        period_start: periodStart,
        period_end: periodEnd,
        base_fee: 3900,
        additional_users_count: additionalUsers,
        additional_users_fee: additionalFee,
        total_amount: total,
        due_date: new Date(now.getFullYear(), now.getMonth(), 5),
        status: 'pending'
      });
      // Send email notification (optional)
    }
  }
  return NextResponse.json({ success: true });
}