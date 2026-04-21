import { supabase } from '@/lib/supabase/client';

export type UserRole = 'student' | 'recruiter' | 'affiliate' | 'institution_admin' | 'consultancy_admin';

export async function getUserRole(): Promise<UserRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role || null;
}

export async function getAccessibleInstitutionIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase.from('profiles').select('role, institution_id, consultancy_id').eq('id', user.id).single();
  if (!profile) return [];
  if (profile.role === 'student' && profile.institution_id) return [profile.institution_id];
  if (profile.role === 'institution_admin' && profile.institution_id) return [profile.institution_id];
  if (profile.role === 'consultancy_admin' && profile.consultancy_id) {
    const { data: links } = await supabase.from('consultancy_institutions').select('institution_id').eq('consultancy_id', profile.consultancy_id);
    return links?.map(l => l.institution_id) || [];
  }
  if (profile.role === 'recruiter') {
    const { data: recruiter } = await supabase.from('recruiters').select('institution_id').eq('user_id', user.id).single();
    return recruiter?.institution_id ? [recruiter.institution_id] : [];
  }
  return [];
}