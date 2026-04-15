import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { institutionId } = await params;

    // Fetch intakes for institution
    const { data: intakes, error } = await supabase
      .from('institution_intakes')
      .select('*')
      .eq('institution_id', institutionId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    // Get performance metrics for each intake
    const intakesWithMetrics = await Promise.all(
      (intakes || []).map(async (intake: any) => {
        const [leadsData, applicationsData, approvalsData, paymentsData] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact' }).eq('intake', intake.name),
          supabase.from('institution_applications').select('id, application_status', { count: 'exact' }),
          supabase.from('institution_applications').select('id', { count: 'exact' }).eq('application_status', 'approved'),
          supabase.from('student_payments').select('amount', { count: 'exact' }).eq('status', 'verified'),
        ]);
        const leadsCount = leadsData.count ?? 0;
        const applicationsCount = applicationsData.count ?? 0;
        const approvalsCount = approvalsData.count ?? 0;

        return {
          id: intake.id,
          name: intake.name,
          startDate: intake.start_date,
          endDate: intake.end_date,
          status: intake.status,
          applications: applicationsCount,
          approved: approvalsCount,
          revenue: paymentsData.data?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
          conversionRate: leadsCount > 0 ? ((applicationsCount / leadsCount) * 100).toFixed(1) : 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      intakes: intakesWithMetrics,
    });
  } catch (error) {
    console.error('Error fetching intakes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch intakes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { institutionId, name, startDate, endDate } = await req.json();

    const { data: intake, error } = await supabase
      .from('institution_intakes')
      .insert({
        institution_id: institutionId,
        name,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      intake,
      message: 'Intake created successfully',
    });
  } catch (error) {
    console.error('Error creating intake:', error);
    return NextResponse.json(
      { error: 'Failed to create intake' },
      { status: 500 }
    );
  }
}
