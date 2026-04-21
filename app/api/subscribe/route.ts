import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { recruiter_id, plan } = await req.json();
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const amounts = { daily: 10, weekly: 40, monthly: 150 };
    const amount = amounts[plan as keyof typeof amounts];
    if (!amount) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    // Record pending payment
    const { data: payment, error } = await supabaseAdmin
      .from('recruiter_subscription_payments')
      .insert({ recruiter_id, amount, status: 'pending' })
      .select()
      .single();
    if (error) throw error;

    // In a real app, integrate Paystack/Stripe/Mobile Money here.
    // For demo, we simulate immediate success.
    const endDate = new Date();
    if (plan === 'daily') endDate.setDate(endDate.getDate() + 1);
    else if (plan === 'weekly') endDate.setDate(endDate.getDate() + 7);
    else endDate.setMonth(endDate.getMonth() + 1);

    await supabaseAdmin
      .from('recruiters')
      .update({
        subscription_status: 'active',
        subscription_end_at: endDate.toISOString(),
      })
      .eq('user_id', recruiter_id);

    await supabaseAdmin
      .from('recruiter_subscription_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', payment.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}