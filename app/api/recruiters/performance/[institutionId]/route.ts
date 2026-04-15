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

    // Fetch all recruiters with their leads and commissions
    const { data: recruiters, error } = await supabase
      .from('recruiters')
      .select(`
        id,
        name,
        email,
        phone,
        referral_code,
        created_at,
        leads:leads(id, name, institution_id),
        commissions(
          id,
          amount,
          status,
          created_at
        )
      `);

    if (error) throw error;

    // Calculate performance metrics
    const recruiterStats = recruiters
      .filter((r: any) => r.leads && r.leads.some((l: any) => l.institution_id === institutionId))
      .map((recruiter: any) => {
        const recruiterLeads = recruiter.leads?.filter((l: any) => l.institution_id === institutionId) || [];
        const recruiterCommissions = recruiter.commissions || [];

        const totalLeads = recruiterLeads.length;
        const totalCommissions = recruiterCommissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        const paidCommissions = recruiterCommissions
          .filter((c: any) => c.status === 'paid')
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
        const pendingCommissions = totalCommissions - paidCommissions;

        return {
          id: recruiter.id,
          name: recruiter.name,
          email: recruiter.email,
          phone: recruiter.phone,
          referralCode: recruiter.referral_code,
          totalLeads,
          totalCommissions,
          paidCommissions,
          pendingCommissions,
          conversionRate: totalLeads > 0 ? ((paidCommissions / totalLeads) * 100).toFixed(1) : 0,
          joinedDate: recruiter.created_at,
          performanceScore: calculatePerformanceScore(totalLeads, paidCommissions),
        };
      })
      .sort((a, b) => b.totalCommissions - a.totalCommissions);

    return NextResponse.json({
      success: true,
      recruiters: recruiterStats,
      summary: {
        totalRecruiters: recruiterStats.length,
        totalLeads: recruiterStats.reduce((sum, r) => sum + r.totalLeads, 0),
        totalCommissions: recruiterStats.reduce((sum, r) => sum + r.totalCommissions, 0),
        paidCommissions: recruiterStats.reduce((sum, r) => sum + r.paidCommissions, 0),
        pendingCommissions: recruiterStats.reduce((sum, r) => sum + r.pendingCommissions, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching recruiters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recruiters' },
      { status: 500 }
    );
  }
}

function calculatePerformanceScore(totalLeads: number, paidCommissions: number): number {
  if (totalLeads === 0) return 0;
  const conversionRate = (paidCommissions / totalLeads) * 100;
  const leadScore = Math.min(totalLeads / 10, 25); // Max 25 points for leads
  const conversionScore = Math.min(conversionRate * 0.5, 50); // Max 50 points for conversion
  const commissionScore = Math.min(paidCommissions / 100, 25); // Max 25 points for commissions
  
  return leadScore + conversionScore + commissionScore;
}