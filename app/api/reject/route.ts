import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { itemId, notes } = await req.json();

    // Update item status
    const { error: updateError } = await supabase
      .from('reconciliation_items')
      .update({ status: 'rejected', notes })
      .eq('id', itemId);
    if (updateError) throw updateError;

    // Get reconciliation to see if all items rejected? (optional)
    const { data: item } = await supabase
      .from('reconciliation_items')
      .select('reconciliation_id')
      .eq('id', itemId)
      .single();

    if (item) {
      const { data: remaining } = await supabase
        .from('reconciliation_items')
        .select('id')
        .eq('reconciliation_id', item.reconciliation_id)
        .in('status', ['pending', 'approved']);
      if (remaining?.length === 0) {
        await supabase
          .from('reconciliations')
          .update({ status: 'rejected' })
          .eq('id', item.reconciliation_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}