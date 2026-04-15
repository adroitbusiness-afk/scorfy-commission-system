import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { itemId, leadId, amount } = await req.json();

    // Get reconciliation item
    const { data: item, error: fetchError } = await supabase
      .from('reconciliation_items')
      .select('*')
      .eq('id', itemId)
      .single();
    if (fetchError || !item) throw new Error('Item not found');

    // Update item status
    const { error: updateError } = await supabase
      .from('reconciliation_items')
      .update({ status: 'approved' })
      .eq('id', itemId);
    if (updateError) throw updateError;

    // Update lead's paid commission
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('paid_commission, total_commission')
      .eq('id', leadId)
      .single();
    if (leadError) throw leadError;

    const newPaid = (lead.paid_commission || 0) + amount;
    const { error: payError } = await supabase
      .from('leads')
      .update({ paid_commission: newPaid })
      .eq('id', leadId);
    if (payError) throw payError;

    // Record commission payment
    await supabase.from('commission_payments').insert({
      lead_id: leadId,
      amount,
      payment_date: new Date().toISOString().split('T')[0],
      source: 'reconciliation',
      reconciled_item_id: itemId,
      status: 'approved',
    });

    // Optionally update reconciliation run status if all items approved
    const { data: remaining } = await supabase
      .from('reconciliation_items')
      .select('id')
      .eq('reconciliation_id', item.reconciliation_id)
      .neq('status', 'approved');
    if (remaining?.length === 0) {
      await supabase
        .from('reconciliations')
        .update({ status: 'approved' })
        .eq('id', item.reconciliation_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}