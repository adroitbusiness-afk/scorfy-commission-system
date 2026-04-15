import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Calculate total revenue from payments table
    const { data, error } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    if (error) throw error;

    const totalRevenue = (data || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);

    return NextResponse.json(totalRevenue);
  } catch (error) {
    console.error('Failed to get total revenue:', error);
    return NextResponse.json(0, { status: 500 });
  }
}
