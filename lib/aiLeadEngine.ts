// lib/aiLeadEngine.ts

export interface LeadInput {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  country?: string;
}

export interface AnalyzedLead extends LeadInput {
  id?: string;
  score: number;
  intent: 'ready_to_apply' | 'price_sensitive' | 'seeking_info' | 'unknown';
  priority: 'high' | 'medium' | 'low';
  action: 'call_now' | 'whatsapp_followup' | 'nurture_sequence';
  tags: string[];
  status: string;
  created_at?: string;
  assigned_recruiter?: string;
  program?: string;
  institution_id?: string; // which institution they are interested in
  last_contact?: string;   // date of last interaction
}

// ------------------------------------------------------------
// 1. Lead Scoring & Analysis (existing, but enhanced)
// ------------------------------------------------------------
export function analyzeLead(lead: LeadInput): AnalyzedLead {
  const text = (lead.notes || '').toLowerCase();
  let score = 0;
  let intent: AnalyzedLead['intent'] = 'unknown';
  let tags: string[] = [];

  // Intent detection
  if (/apply|application|join|enroll/.test(text)) {
    intent = 'ready_to_apply';
    score += 60;
  } else if (/fees|price|cost|how much/.test(text)) {
    intent = 'price_sensitive';
    score += 40;
  } else if (/info|information|details|course/.test(text)) {
    intent = 'seeking_info';
    score += 25;
  }

  // Urgency
  if (/now|today|asap|urgent/.test(text)) {
    score += 25;
    tags.push('urgent');
  }

  // Country bias (Zambia primary market)
  if (lead.country?.toLowerCase() === 'zambia') {
    score += 20;
    tags.push('local_market');
  }

  // Segment detection
  if (/child|kid|grade|school/.test(text)) tags.push('parent');
  else tags.push('student');

  // Engagement depth
  if (text.length > 50) score += 15;

  // Determine priority & action
  let priority: AnalyzedLead['priority'] = 'low';
  let action: AnalyzedLead['action'] = 'nurture_sequence';
  if (score >= 70) {
    priority = 'high';
    action = 'call_now';
  } else if (score >= 40) {
    priority = 'medium';
    action = 'whatsapp_followup';
  } else {
    priority = 'low';
    action = 'nurture_sequence';
  }

  return {
    ...lead,
    score,
    intent,
    priority,
    action,
    tags,
    status: 'new',
    last_contact: new Date().toISOString(),
  };
}

// ------------------------------------------------------------
// 2. Generate WhatsApp Status Update (daily engagement)
// ------------------------------------------------------------
export function generateWhatsAppStatusUpdate(lead: AnalyzedLead): string {
  const today = new Date().toLocaleDateString('en-ZM', { weekday: 'long', month: 'short', day: 'numeric' });
  
  const statuses: Record<string, string> = {
    ready_to_apply: `🎓 Ready to apply? ${lead.name}, your future starts here! Visit our application portal today: [APPLICATION LINK]`,
    price_sensitive: `💰 Worried about fees? We offer flexible payment plans. Contact us to discuss a plan that works for you!`,
    seeking_info: `📚 Still researching? Check out our program brochure: [VIEW PROGRAMS BUTTON]. DM me for a personal consultation.`,
  };
  
  const defaultStatus = `📢 ${lead.name}, have you seen our latest intake? Programs start soon. Apply now: [APPLICATION LINK]`;
  
  let key: keyof typeof statuses = lead.intent;
  if (lead.tags.includes('urgent')) key = 'ready_to_apply';
  
  return statuses[key] || defaultStatus;
}

// ------------------------------------------------------------
// 3. Generate Facebook Post Content
// ------------------------------------------------------------
export function generateFacebookPost(lead: AnalyzedLead): string {
  const posts: Record<string, string> = {
    ready_to_apply: `🎉 ${lead.name} is ready to apply! We're excited to welcome new students. Apply today: [APPLICATION LINK]`,
    price_sensitive: `💰 Did you know? We offer affordable payment plans. ${lead.name}, check out our flexible options.`,
    seeking_info: `📖 Explore our programs: [VIEW PROGRAMS BUTTON]. ${lead.name}, take the next step in your education journey.`,
    urgent: `🚨 Last chance! Intake closing soon. ${lead.name}, apply before [DATE] to avoid missing out.`,
  };
  
  const defaultPost = `🎓 New intake open! ${lead.name}, join our community of successful graduates. Apply here: [APPLICATION LINK]`;
  
  return posts[lead.intent] || defaultPost;
}

// ------------------------------------------------------------
// 4. Suggest Next Steps for Recruiter
// ------------------------------------------------------------
export function suggestNextSteps(lead: AnalyzedLead): string[] {
  const steps: string[] = [];
  
  if (lead.score >= 70) {
    steps.push('📞 Call the lead immediately (high intent)');
    steps.push('💬 Send a personalized WhatsApp message with the application link');
    steps.push('📅 Schedule a follow‑up call within 24 hours');
  } else if (lead.score >= 40) {
    steps.push('💬 Send a WhatsApp follow‑up with program highlights');
    steps.push('📧 Email a brochure and application checklist');
    steps.push('⏰ Remind about upcoming intake deadlines');
  } else {
    steps.push('📧 Send a nurture email sequence (weekly)');
    steps.push('👍 Add lead to a newsletter list');
    steps.push('🔔 Wait for further engagement before direct contact');
  }
  
  // Add program‑specific advice if lead mentioned a program
  if (lead.program) {
    steps.push(`🎓 Share specific details about ${lead.program} (fees, duration, career outcomes)`);
  }
  
  return steps;
}

// ------------------------------------------------------------
// 5. Lead Analytics (aggregate)
// ------------------------------------------------------------
export interface LeadAnalytics {
  totalLeads: number;
  averageScore: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  intentBreakdown: { intent: string; count: number }[];
  conversionRate: number; // leads converted / total leads
  topSources: { source: string; count: number }[];
  weeklyTrend: { week: string; leads: number; conversions: number }[];
  recommendations: string[];
}

export function calculateLeadAnalytics(leads: AnalyzedLead[]): LeadAnalytics {
  const total = leads.length;
  const avgScore = total ? Math.round(leads.reduce((s, l) => s + l.score, 0) / total) : 0;
  const high = leads.filter(l => l.priority === 'high').length;
  const medium = leads.filter(l => l.priority === 'medium').length;
  const low = leads.filter(l => l.priority === 'low').length;
  
  const intentCounts: Record<string, number> = {};
  leads.forEach(l => { intentCounts[l.intent] = (intentCounts[l.intent] || 0) + 1; });
  const intentBreakdown = Object.entries(intentCounts).map(([intent, count]) => ({ intent, count }));
  
  const converted = leads.filter(l => l.status === 'converted').length;
  const conversionRate = total ? (converted / total) * 100 : 0;
  
  // Simple source extraction (from notes or tags)
  const sourceCounts: Record<string, number> = {};
  leads.forEach(l => {
    let source = 'unknown';
    if (l.tags.includes('website')) source = 'website';
    else if (l.tags.includes('referral')) source = 'referral';
    else if (l.tags.includes('social')) source = 'social_media';
    else if (l.tags.includes('call')) source = 'phone_call';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  const topSources = Object.entries(sourceCounts).map(([source, count]) => ({ source, count })).sort((a,b) => b.count - a.count);
  
  // Weekly trend (last 4 weeks)
  const weeklyData: Record<string, { leads: number; conversions: number }> = {};
  const now = new Date();
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() + 7 * i));
    const weekKey = weekStart.toISOString().slice(0,10);
    weeklyData[weekKey] = { leads: 0, conversions: 0 };
  }
  leads.forEach(l => {
    if (!l.created_at) return;
    const date = new Date(l.created_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toISOString().slice(0,10);
    if (weeklyData[key]) {
      weeklyData[key].leads++;
      if (l.status === 'converted') weeklyData[key].conversions++;
    }
  });
  const weeklyTrend = Object.entries(weeklyData).map(([week, data]) => ({ week, leads: data.leads, conversions: data.conversions }));
  
  // Recommendations
  const recommendations: string[] = [];
  if (high > 0) recommendations.push(`🔥 ${high} hot leads – call them immediately.`);
  if (medium > 0) recommendations.push(`💬 ${medium} warm leads – send WhatsApp follow‑ups today.`);
  if (avgScore < 30) recommendations.push(`📊 Average lead score low – review your lead sources and improve qualification.`);
  if (conversionRate < 10) recommendations.push(`⚠️ Conversion rate is below 10% – focus on nurturing high‑intent leads.`);
  
  return {
    totalLeads: total,
    averageScore: avgScore,
    highPriorityCount: high,
    mediumPriorityCount: medium,
    lowPriorityCount: low,
    intentBreakdown,
    conversionRate,
    topSources,
    weeklyTrend,
    recommendations,
  };
}

// ------------------------------------------------------------
// 6. Generate Daily Engagement Content (for social media)
// ------------------------------------------------------------
export interface EngagementContent {
  whatsappStatus: string;
  facebookPost: string;
  instagramCaption: string;
  emailSubject: string;
  emailBody: string;
}

export function generateDailyEngagementContent(leads: AnalyzedLead[]): EngagementContent {
  const hotLeads = leads.filter(l => l.priority === 'high').length;
  const totalLeads = leads.length;
  const topProgram = getMostPopularProgram(leads);
  
  const whatsappStatus = `📢 Daily update: ${hotLeads} hot leads today! ${totalLeads} active leads. Our team is working hard to help students enroll. 🎓`;
  const facebookPost = `🎓 New week, new opportunities! We're helping ${totalLeads} students find the right program. Need advice? Comment below or DM us. #Education #Zambia`;
  const instagramCaption = `✨ ${totalLeads} students are taking the next step! Want to join them? Tap the link in bio to explore programs. 🚀`;
  const emailSubject = `Your weekly education update – ${new Date().toLocaleDateString()}`;
  const emailBody = `Hello,\n\nWe have ${totalLeads} active inquiries this week. ${hotLeads} are ready to apply! ${topProgram ? `The most requested program is ${topProgram}.` : ''} Visit our website to learn more.\n\nBest regards,\nDMBDC Team`;
  
  return { whatsappStatus, facebookPost, instagramCaption, emailSubject, emailBody };
}

function getMostPopularProgram(leads: AnalyzedLead[]): string | null {
  const counts: Record<string, number> = {};
  leads.forEach(l => { if (l.program) counts[l.program] = (counts[l.program] || 0) + 1; });
  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.sort((a,b) => b[1] - a[1])[0][0];
}

// ------------------------------------------------------------
// 7. Updated Reply Generator (with real application link & view programs button)
// ------------------------------------------------------------
export function generateReply(lead: AnalyzedLead): string {
  const applicationLink = `[APPLICATION LINK: ${process.env.NEXT_PUBLIC_APP_URL || 'https://dmbdc.com'}/apply?ref=${lead.id}]`;
  const viewProgramsButton = `👉 [VIEW PROGRAMS](${process.env.NEXT_PUBLIC_APP_URL || 'https://dmbdc.com'}/programs)`;
  
  if (lead.priority === 'high') {
    return `Hello 👋\n\nYou're just one step away from joining DMBDC 🎓\n\nApply here now:\n${applicationLink}\n\nI can guide you immediately.`;
  }
  if (lead.intent === 'price_sensitive') {
    return `Hello 👋\n\nOur programs are affordable and flexible 💰\n\nWe even allow installment payments.\n\nWould you like a breakdown? ${viewProgramsButton}`;
  }
  if (lead.intent === 'seeking_info') {
    return `Hello 👋\n\nExplore our programs:\n${viewProgramsButton}\n\nWhich course are you interested in?`;
  }
  return `Hello 👋\n\nThanks for reaching out to DMBDC 🎓\n\n${viewProgramsButton}\n\nLet me know how I can help you.`;
}