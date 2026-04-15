import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  const { ref_no, signer_id } = await req.json();
  if (!ref_no || !signer_id) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

  // Update admission as signed
  const { error } = await supabaseAdmin
    .from('admissions')
    .update({
      status: 'confirmed',
      signed_by: signer_id,
      signed_at: new Date().toISOString(),
    })
    .eq('ref_no', ref_no);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate PDF from DOCX (mock – in real world, convert DOCX to PDF)
  // For demo, we just copy the docx URL as pdf URL
  const { data: admission } = await supabaseAdmin.from('admissions').select('docx_url').eq('ref_no', ref_no).single();
  await supabaseAdmin.from('admissions').update({ pdf_url: admission.docx_url.replace('.docx', '.pdf') }).eq('ref_no', ref_no);

  return NextResponse.json({ success: true });
}