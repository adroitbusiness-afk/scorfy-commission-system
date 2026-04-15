import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { parseFile } from '@/lib/parseFile'; // your existing file parser
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse file – returns array of rows with { name, email, amount, ... }
    const parsed = await parseFile(file);
    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { data?: unknown[] })?.data)
        ? (parsed as { data: Array<Record<string, any>> }).data
        : [];

    // Get current user (recruiter)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: recruiter } = await supabase
      .from('recruiters')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!recruiter) {
      return NextResponse.json({ error: 'Recruiter not found' }, { status: 403 });
    }

    // Create reconciliation run
    const { data: reconciliation, error: recError } = await supabase
      .from('reconciliations')
      .insert({ file_name: file.name, uploaded_by: recruiter.id, status: 'pending' })
      .select()
      .single();
    if (recError) throw recError;

    const results = [];

    // Process each row
    for (const row of rows) {
      // Find lead by email or phone (customize as needed)
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .or(`email.eq.${row.email},phone.eq.${row.phone},student_number.eq.${row.student_number}`)
        .maybeSingle();

      const matched = !!lead;

      const item = {
        id: uuidv4(),
        reconciliation_id: reconciliation.id,
        lead_id: lead?.id || null,
        amount: row.amount,
        matched,
        status: matched ? 'pending' : 'missing',
        notes: matched ? null : 'No matching lead found',
      };

      const { error: insertError } = await supabase
        .from('reconciliation_items')
        .insert(item);
      if (insertError) throw insertError;

      results.push({
        id: item.id,
        lead_id: lead?.id || null,
        amount: row.amount,
        status: item.status,
        message: matched ? 'Ready for approval' : 'No matching lead',
        data: { name: row.name, email: row.email },
      });
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
