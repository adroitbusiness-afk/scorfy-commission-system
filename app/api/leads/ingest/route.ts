import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeLead } from '@/lib/aiLeadEngine';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceKey);

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let leads: any[] = [];
    let institutionId: string | null = null;
    let preferredRecruiter: string | null = null;

    // Handle multipart/form-data (file upload)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      institutionId = formData.get('institution_id') as string || null;
      preferredRecruiter = formData.get('recruiter_id') as string || null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      const fileName = file.name;
      const fileType = fileName.split('.').pop()?.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      if (fileType === 'csv') {
        const text = await file.text();
        const { data } = Papa.parse(text, { header: true, skipEmptyLines: true });
        leads = data.map((row: any) => ({
          name: row.Name || row.name || row['Student Name'] || 'Unknown',
          email: row.Email || row.email || '',
          phone: row.Phone || row.phone || '',
          program: row.Program || row.program || 'Not specified',
          country: row.Country || row.country || null,
          notes: 'Imported from CSV',
        }));
      } else if (fileType === 'xlsx' || fileType === 'xls') {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        leads = rows.map((row: any) => ({
          name: row.Name || row.name || row['Student Name'] || 'Unknown',
          email: row.Email || row.email || '',
          phone: row.Phone || row.phone || '',
          program: row.Program || row.program || 'Not specified',
          country: row.Country || row.country || null,
          notes: 'Imported from Excel',
        }));
      } else {
        return NextResponse.json(
          { error: 'Unsupported file type. Please upload CSV or Excel files.' },
          { status: 400 }
        );
      }
    } 
    // Handle JSON (existing logic)
    else {
      const body = await req.json();
      leads = body?.leads || [];
      institutionId = body?.institution_id ?? null;
      preferredRecruiter = body?.recruiter_id ?? null;

      if (!Array.isArray(leads) || leads.length === 0) {
        return NextResponse.json({ error: 'No leads provided' }, { status: 400 });
      }
    }

    // Fetch active recruiters for round‑robin
    let recruiters: string[] = [];
    if (!preferredRecruiter) {
      const { data } = await supabase
        .from('recruiters')
        .select('id')
        .eq('status', 'active');
      recruiters = (data || []).map((r) => r.id);
    }

    let rrIndex = 0;
    let inserted = 0;
    let updated = 0;
    const now = new Date().toISOString();

    for (const raw of leads) {
      const phone = raw.phone?.trim() || null;
      const email = raw.email?.trim() || null;

      const assignedRecruiter =
        preferredRecruiter ||
        (recruiters.length > 0 ? recruiters[rrIndex++ % recruiters.length] : null);

      let existingId: string | null = null;
      if (phone || email) {
        const orFilters = [];
        if (phone) orFilters.push(`phone.eq.${phone}`);
        if (email) orFilters.push(`email.eq.${email}`);
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .or(orFilters.join(','))
          .limit(1)
          .maybeSingle();
        existingId = existing?.id || null;
      }

      const analysis = analyzeLead({
        name: raw.name || '',
        email: raw.email || '',
        phone: raw.phone || '',
        notes: raw.notes || '',
        country: raw.country,
      });

      const payload = {
        name: raw.name || '',
        email,
        phone,
        country: raw.country || analysis.country || null,
        program: raw.program || null,
        notes: raw.notes || null,
        institution_id: raw.institution_id ?? institutionId,
        assigned_recruiter: assignedRecruiter,
        status: 'new',
        source: raw.source || (contentType.includes('multipart') ? 'CSV/Excel Import' : 'import'),
        lead_score: analysis.score,
        intent: analysis.intent,
        priority: analysis.priority,
        recommended_action: analysis.action,
        tags: (analysis.tags || []).join(','),
        updated_at: now,
        created_at: now,
      };

      if (existingId) {
        const { error } = await supabase.from('leads').update(payload).eq('id', existingId);
        if (error) throw error;
        updated++;
      } else {
        const { error } = await supabase.from('leads').insert(payload);
        if (error) throw error;
        inserted++;
      }
    }

    return NextResponse.json({ inserted, updated });
  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error.message || 'Ingest failed' }, { status: 500 });
  }
}