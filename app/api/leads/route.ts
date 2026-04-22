import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { analyzeLead } from '@/lib/aiLeadEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Apply AI analysis to each lead (or you can store pre‑computed fields)
  const analyzedLeads = leads.map((lead) => analyzeLead(lead));

  return NextResponse.json(analyzedLeads);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, phone, notes, country } = body;

  if (!name || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check duplicate by email or phone
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .or(`email.eq.${email},phone.eq.${phone}`)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Lead already exists' }, { status: 409 });
  }

  // Analyze the lead
  const analyzed = analyzeLead({ name, email, phone, notes, country });

  // Insert into Supabase
  const { data: newLead, error: insertError } = await supabase
    .from('leads')
    .insert({
      name,
      email,
      phone,
      notes,
      country,
      status: analyzed.status,
      lead_score: analyzed.score,
      // Store additional AI fields if you add columns
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ lead: newLead, analysis: analyzed });
}