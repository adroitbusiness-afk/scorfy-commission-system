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

    // Fetch all relevant data in parallel
    const [leadsData, applicationsData, paymentsData, recruitersData] = await Promise.all([
      supabase
        .from('leads')
        .select('id, created_at, institution_id')
        .eq('institution_id', institutionId),
      supabase
        .from('institution_applications')
        .select('id, application_status, leads(id), created_at'),
      supabase
        .from('student_payments')
        .select('id, amount, status, created_at, leads(id, institution_id)')
        .eq('status', 'verified'),
      supabase
        .from('recruiters')
        .select('id, name, commissions(amount, status)')
        .limit(5),
    ]);

    const leads = leadsData.data || [];
    const applications = applicationsData.data || [];
    const payments = paymentsData.data || [];
    const recruiters = recruitersData.data || [];

    // Calculate funnel metrics
    const totalLeads = leads.length;
    const totalApplications = applications.length;
    const approvedApplications = applications.filter(a => a.application_status === 'approved').length;
    const totalPaid = payments.length;

    const conversionRate = totalLeads > 0 ? ((totalApplications / totalLeads) * 100).toFixed(1) : 0;
    const approvalRate = totalApplications > 0 ? ((approvedApplications / totalApplications) * 100).toFixed(1) : 0;
    const paymentRate = approvedApplications > 0 ? ((totalPaid / approvedApplications) * 100).toFixed(1) : 0;

    // Calculate revenue
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const expectedRevenue = approvedApplications * 8500; // Adjust based on average fee
    const outstandingBalance = expectedRevenue - totalRevenue;

    // Group by program
    const byProgram = applications.reduce((acc: any, app) => {
      const programName = (app as any).program_name || 'Unknown';
      if (!acc[programName]) {
        acc[programName] = { total: 0, approved: 0, paid: 0 };
      }
      acc[programName].total += 1;
      if (app.application_status === 'approved') acc[programName].approved += 1;
      return acc;
    }, {});

    // Group by recruiter performance
    const recruiterPerformance = recruiters.map((r: any) => {
      const commissions = r.commissions || [];
      const totalCommissions = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
      const paidCommissions = commissions
        .filter((c: any) => c.status === 'paid')
        .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

      return {
        id: r.id,
        name: r.name,
        totalCommissions,
        paidCommissions,
        pendingCommissions: totalCommissions - paidCommissions,
        claimCount: commissions.length,
      };
    });

    // Time-based trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const leadsLast30Days = leads.filter(l => new Date(l.created_at) > thirtyDaysAgo).length;
    const appsLast30Days = applications.filter(a => new Date(a.created_at) > thirtyDaysAgo).length;
    const revenueL30Days = payments
      .filter(p => new Date(p.created_at) > thirtyDaysAgo)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return NextResponse.json({
      success: true,
      funnel: {
        totalLeads,
        totalApplications,
        approvedApplications,
        totalPaid,
        conversionRate: parseFloat(conversionRate.toString()),
        approvalRate: parseFloat(approvalRate.toString()),
        paymentRate: parseFloat(paymentRate.toString()),
      },
      revenue: {
        totalRevenue,
        expectedRevenue,
        outstandingBalance,
        averagePerStudent: totalPaid > 0 ? (totalRevenue / totalPaid).toFixed(0) : 0,
      },
      byProgram,
      recruiterPerformance: recruiterPerformance.sort((a, b) => b.totalCommissions - a.totalCommissions),
      trends: {
        leadsLast30Days,
        appsLast30Days,
        revenueL30Days,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}