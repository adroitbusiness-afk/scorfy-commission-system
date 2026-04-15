// lib/scorfyAnalytics.ts
import { supabase } from './supabase/client';

export interface AnalyticsResult {
  suggestion: string;
  nextSteps: string[];
  insights: {
    totalLeads: number;
    highPriority: number;
    readyToApply: number;
    conversionRate: number;
    messagesToday: number;
    callsToday: number;
    answeredRate: number;
    admissionsGenerated: number;
    points: number;
    level: number;
  };
}

export async function getScorfyAnalytics(recruiterId: string): Promise<AnalyticsResult> {
  // Fetch real data from Supabase
  const [leadsRes, actionsRes, admissionsRes, pointsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('status, priority, intent')
      .eq('assigned_recruiter', recruiterId),
    supabase
      .from('recruiter_actions')
      .select('action_type, status, created_at')
      .eq('recruiter_id', recruiterId)
      .gte('created_at', new Date().toISOString().split('T')[0]), // today only
    supabase
      .from('admissions')
      .select('id', { count: 'exact', head: true })
      .eq('admitted_by', recruiterId),
    supabase
      .from('recruiter_points')
      .select('points, level')
      .eq('recruiter_id', recruiterId)
      .maybeSingle()
  ]);

  const leads = leadsRes.data || [];
  const actions = actionsRes.data || [];
  const admissionsCount = admissionsRes.count || 0;
  const points = pointsRes.data?.points || 0;
  const level = pointsRes.data?.level || 1;

  const totalLeads = leads.length;
  const highPriority = leads.filter(l => l.priority === 'high').length;
  const readyToApply = leads.filter(l => l.intent === 'ready_to_apply').length;
  const converted = leads.filter(l => l.status === 'converted').length;
  const conversionRate = totalLeads ? (converted / totalLeads) * 100 : 0;

  const messagesToday = actions.filter(a => a.action_type === 'whatsapp' || a.action_type === 'email').length;
  const callsToday = actions.filter(a => a.action_type === 'call').length;
  const answered = actions.filter(a => a.status === 'answered').length;
  const answeredRate = callsToday ? (answered / callsToday) * 100 : 0;

  // Rule‑based suggestion generation
  let suggestion = '';
  if (highPriority > 0) {
    suggestion = `⚠️ You have ${highPriority} high-priority leads that have not been contacted yet. Reach out to them first to increase conversion.`;
  } else if (readyToApply > 0) {
    suggestion = `🎯 ${readyToApply} leads are ready to apply. Send them the application link today.`;
  } else if (callsToday === 0 && messagesToday === 0) {
    suggestion = `📞 You haven't made any calls or sent messages today. Start with the top 5 high-score leads.`;
  } else {
    suggestion = `📈 Great job! You've made ${callsToday} calls and ${messagesToday} messages today. Keep following up with qualified leads.`;
  }

  // Generate next steps based on data
  const nextSteps: string[] = [];
  if (highPriority > 0) nextSteps.push(`Contact ${highPriority} high-priority leads`);
  if (readyToApply > 0) nextSteps.push(`Send application links to ${readyToApply} ready-to-apply leads`);
  if (answeredRate < 50 && callsToday > 0) nextSteps.push('Try calling at different times to improve answer rate');
  if (conversionRate < 20 && totalLeads > 10) nextSteps.push('Review your follow‑up strategy – conversion rate is low');
  if (nextSteps.length === 0) nextSteps.push('Continue engaging with qualified leads and monitor for new inquiries');

  return {
    suggestion,
    nextSteps,
    insights: {
      totalLeads,
      highPriority,
      readyToApply,
      conversionRate,
      messagesToday,
      callsToday,
      answeredRate,
      admissionsGenerated: admissionsCount,
      points,
      level,
    },
  };
}