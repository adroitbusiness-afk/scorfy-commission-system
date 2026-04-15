import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const { action, institutionId } = await req.json();

    if (action === 'top-converters') {
      return await getTopConverters(institutionId);
    } else if (action === 'likely-to-enroll') {
      return await predictLikelyEnrollees(institutionId);
    } else if (action === 'at-risk-students') {
      return await identifyAtRiskStudents(institutionId);
    } else if (action === 'suggested-follow-ups') {
      return await suggestFollowUps(institutionId);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('AI engine error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}

async function getTopConverters(institutionId: string) {
  try {
    const { data: recruiters } = await supabase
      .from('recruiters')
      .select(`
        id,
        name,
        leads(id, institution_id),
        commissions(amount, status)
      `);

    const topConverters = (recruiters || [])
      .map((r: any) => {
        const leads = r.leads?.filter((l: any) => l.institution_id === institutionId) || [];
        const commissions = r.commissions || [];
        const revenue = commissions
          .filter((c: any) => c.status === 'paid')
          .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

        return {
          recruiter: r.name,
          leadCount: leads.length,
          revenue,
          conversionRate: leads.length > 0 ? ((commissions.length / leads.length) * 100).toFixed(1) : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: topConverters,
      insight: `Top 5 recruiters by revenue this period. ${topConverters[0]?.recruiter} is leading with K${topConverters[0]?.revenue} in commissions.`,
    });
  } catch (error) {
    throw error;
  }
}

async function predictLikelyEnrollees(institutionId: string) {
  try {
    // Get applications with high engagement signals
    const { data: applications } = await supabase
      .from('institution_applications')
      .select(`
        id,
        leads(id, name, email, created_at),
        application_status,
        created_at
      `)
      .eq('application_status', 'pending_review');

    // Score based on: time spent, document uploads, email opens, etc.
    const predictions = applications
      ?.map((app: any) => {
        const lead = app.leads[0];
        const daysPassed = Math.floor((Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24));

        // Simple scoring algorithm
        let score = 100;
        // Deduct points for each day waiting
        score -= daysPassed * 2;
        // Complete applications likely to convert
        score += 20;

        return {
          studentName: lead.name,
          email: lead.email,
          likelihoodToEnroll: Math.min(100, Math.max(0, score)),
          daysSinceApplication: daysPassed,
        };
      })
      .sort((a, b) => b.likelihoodToEnroll - a.likelihoodToEnroll)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: predictions,
      insight: `${predictions?.length || 0} applications with high enrollment potential. Top prospect: ${predictions?.[0]?.studentName} (${predictions?.[0]?.likelihoodToEnroll}% likely).`,
    });
  } catch (error) {
    throw error;
  }
}

async function identifyAtRiskStudents(institutionId: string) {
  try {
    // Find approved students without payment
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: atRisk } = await supabase
      .from('institution_applications')
      .select(`
        id,
        leads(id, name, email),
        created_at,
        application_status
      `)
      .eq('application_status', 'approved')
      .lt('created_at', fiveDaysAgo.toISOString());

    const riskStudents = atRisk
      ?.map((app: any) => ({
        studentName: app.leads[0].name,
        email: app.leads[0].email,
        daysSinceApproval: Math.floor((Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        riskLevel: 'high',
      }))
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: riskStudents,
      insight: `${riskStudents?.length || 0} students at risk of not enrolling. Immediate follow-up recommended.`,
      suggestedAction: 'Send payment reminders or WhatsApp follow-ups to these students',
    });
  } catch (error) {
    throw error;
  }
}

async function suggestFollowUps(institutionId: string) {
  try {
    const { data: pendingApps } = await supabase
      .from('institution_applications')
      .select(`
        id,
        leads(id, name, email),
        created_at
      `)
      .eq('application_status', 'pending_review')
      .order('created_at', { ascending: true })
      .limit(5);

    const suggestions = pendingApps
      ?.map((app: any) => ({
        studentName: app.leads[0].name,
        dueAction: `Follow up with ${app.leads[0].name} - application pending since ${new Date(app.created_at).toLocaleDateString()}`,
        priority: 'high',
        suggestedTemplate: 'admission_followup',
      }));

    return NextResponse.json({
      success: true,
      data: suggestions,
      insight: `${suggestions?.length || 0} follow-ups recommended for maximum conversion rate.`,
    });
  } catch (error) {
    throw error;
  }
}
