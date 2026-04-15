import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get('institution_id');

    if (!institutionId) {
      return NextResponse.json({ error: 'Institution ID required' }, { status: 400 });
    }

    // Get institution revenue from applications and payments
    const { data: applications, error: appsError } = await supabase
      .from('leads')
      .select('id, status')
      .eq('institution_id', institutionId);

    if (appsError) throw appsError;

    // Mock revenue calculation - in real implementation, this would join with payments
    const totalRevenue = (applications || []).filter(app => app.status === 'approved').length * 500; // K500 per enrollment

    return NextResponse.json(totalRevenue);
  } catch (error) {
    console.error('Failed to get institution revenue:', error);
    return NextResponse.json(0, { status: 500 });
  }
}
