import { AnalyzedLead } from '@/lib/aiLeadEngine';

export interface RecruiterType {
  id: string;
  name: string;
  email: string;
  phone?: string;
  referral_code: string;
  user_id: string;
  user?: any;
}

export interface StatsType {
  totalLeads: number;
  converted: number;
  pendingCommissions: number;
  paidCommissions: number;
  rewardPoints: number;
  avgScore: number;
  highPriorityCount: number;
  readyToApplyCount: number;
  pendingTasks: number;
}

export interface ChartDataPoint {
  month: string;
  leads: number;
  converted: number;
}

export interface CountryData {
  name: string;
  value: number;
}

export interface ProgramData {
  name: string;
  value: number;
}

export interface LeadWithScore extends AnalyzedLead {
  id: string;
  assigned_recruiter?: string;
  created_at: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
}
