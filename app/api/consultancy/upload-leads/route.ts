import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const consultancyId = formData.get('consultancy_id') as string;
    if (!file || !consultancyId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all institutions under this consultancy
    const { data: institutions } = await supabaseAdmin
      .from('consultancy_institutions')
      .select('institution_id')
      .eq('consultancy_id', consultancyId);

    if (!institutions || institutions.length === 0) {
      return NextResponse.json({ error: 'No institutions found for this consultancy' }, { status: 400 });
    }

    const instIds = institutions.map(i => i.institution_id);

    // Get all recruiters under those institutions
    const { data: recruiters } = await supabaseAdmin
      .from('recruiters')
      .select('user_id')
      .in('institution_id', instIds);

    const recruiterIds = recruiters?.map(r => r.user_id) || [];
    if (recruiterIds.length === 0) {
      return NextResponse.json({ error: 'No recruiters found' }, { status: 400 });
    }

    // Parse file (CSV or Excel)
    const buffer = await file.arrayBuffer();
    let leadsData: any[] = [];
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      const result = Papa.parse(text, { header: true });
      leadsData = result.data;
    } else {
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      leadsData = XLSX.utils.sheet_to_json(sheet);
    }

    let inserted = 0;
    for (const lead of leadsData) {
      if (!lead.name || !lead.email) continue;
      // Create one lead per recruiter (shared)
      for (const recruiterId of recruiterIds) {
        const { error } = await supabaseAdmin.from('leads').insert({
          name: lead.name,
          email: lead.email,
          phone: lead.phone || '',
          program: lead.program || '',
          notes: lead.notes || '',
          assigned_recruiter: recruiterId,
          status: 'new',
          institution_id: lead.institution_id || instIds[0],
          created_at: new Date().toISOString(),
        });
        if (!error) inserted++;
      }
    }
    return NextResponse.json({ success: true, inserted });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}