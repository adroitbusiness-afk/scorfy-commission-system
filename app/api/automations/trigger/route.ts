import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const { automation } = await req.json();

    if (automation === 'follow-up-pending') {
      return await triggerPendingFollowUp();
    } else if (automation === 'payment-reminder') {
      return await triggerPaymentReminder();
    } else if (automation === 'commission-trigger') {
      return await triggerCommissionCreation();
    }

    return NextResponse.json({ error: 'Unknown automation' }, { status: 400 });
  } catch (error) {
    console.error('Automation error:', error);
    return NextResponse.json(
      { error: 'Failed to execute automation' },
      { status: 500 }
    );
  }
}

async function triggerPendingFollowUp() {
  try {
    // Find applications pending for 3+ days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: pendingApps, error } = await supabase
      .from('institution_applications')
      .select(`
        id,
        leads(id, name, email, phone),
        created_at
      `)
      .eq('application_status', 'pending_review')
      .lt('created_at', threeDaysAgo.toISOString())
      .is('follow_up_sent_at', null);

    if (error) throw error;

    let processedCount = 0;

    for (const app of pendingApps || []) {
      // Send follow-up message
      await supabase.from('institution_messages').insert({
        institution_id: (app as any).leads[0].institution_id,
        title: 'Application Follow-up',
        message: `Hi ${(app as any).leads[0].name}, we're still reviewing your application. Thank you for your patience!`,
        audience_type: 'applicants',
        channel: 'email',
        recipient_count: 1,
        sent_at: new Date().toISOString(),
      });

      // Mark as follow-up sent
      await supabase
        .from('institution_applications')
        .update({ follow_up_sent_at: new Date().toISOString() })
        .eq('id', app.id);

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      automation: 'follow-up-pending',
      processed: processedCount,
    });
  } catch (error) {
    console.error('Follow-up error:', error);
    throw error;
  }
}

async function triggerPaymentReminder() {
  try {
    // Find approved students with no payment in 5+ days
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: approvedNoPay, error } = await supabase
      .from('institution_applications')
      .select(`
        id,
        leads(id, name, email, phone, institution_id),
        created_at
      `)
      .eq('application_status', 'approved')
      .not('leads->student_payments', 'neq', 'null');

    if (error) throw error;

    let processedCount = 0;

    for (const app of approvedNoPay || []) {
      const lead = (app as any).leads[0];

      // Check if payment was made recently
      const { data: recentPayments } = await supabase
        .from('student_payments')
        .select('*')
        .eq('student_id', lead.id)
        .gte('created_at', fiveDaysAgo.toISOString());

      if (!recentPayments || recentPayments.length === 0) {
        // Send payment reminder
        await supabase.from('institution_messages').insert({
          institution_id: lead.institution_id,
          title: 'Payment Reminder',
          message: `Hi ${lead.name}, your application has been approved! Please complete your semester fee payment to secure your place.`,
          audience_type: 'accepted',
          channel: 'email',
          recipient_count: 1,
          sent_at: new Date().toISOString(),
        });

        processedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      automation: 'payment-reminder',
      processed: processedCount,
    });
  } catch (error) {
    console.error('Payment reminder error:', error);
    throw error;
  }
}

async function triggerCommissionCreation() {
  try {
    // Find verified payments that haven't created commissions yet
    const { data: verifiedPayments, error } = await supabase
      .from('student_payments')
      .select(`
        id,
        amount,
        student_id,
        leads(id, referred_by, institution_id),
        commissions(id)
      `)
      .eq('status', 'verified')
      .is('commissions.id', null);

    if (error) throw error;

    let processedCount = 0;

    for (const payment of verifiedPayments || []) {
      const lead = (payment as any).leads[0];

      if (lead.referred_by) {
        // Get recruiter by referral code
        const { data: recruiter } = await supabase
          .from('recruiters')
          .select('id')
          .eq('referral_code', lead.referred_by)
          .single();

        if (recruiter) {
          // Create commission claim
          const commissionAmount = 500; // K500 per semester

          await supabase.from('commissions').insert({
            recruiter_id: recruiter.id,
            student_id: lead.id,
            institution_id: lead.institution_id,
            amount: commissionAmount,
            status: 'pending',
            payment_id: payment.id,
            created_at: new Date().toISOString(),
          });

          processedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      automation: 'commission-trigger',
      processed: processedCount,
    });
  } catch (error) {
    console.error('Commission trigger error:', error);
    throw error;
  }
}