import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { ref_no, signer_id } = await req.json();

    if (!ref_no || !signer_id) {
      return NextResponse.json({ error: 'Missing ref_no or signer_id' }, { status: 400 });
    }

    // 1. Update admission as signed
    const { error: updateError } = await supabaseAdmin
      .from('admissions')
      .update({
        status: 'confirmed',
        signed_by: signer_id,
        signed_at: new Date().toISOString(),
      })
      .eq('ref_no', ref_no);

    if (updateError) {
      console.error('Error updating admission:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Fetch the docx_url to generate pdf_url
    const { data: admission, error: fetchError } = await supabaseAdmin
      .from('admissions')
      .select('docx_url')
      .eq('ref_no', ref_no)
      .single();

    if (fetchError || !admission || !admission.docx_url) {
      console.error('Admission not found or missing docx_url:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Admission record not found or no docx_url' },
        { status: 404 }
      );
    }

    // 3. Generate PDF URL by replacing .docx extension (case-insensitive, only at end)
    const pdfUrl = admission.docx_url.replace(/\.docx$/i, '.pdf');

    // 4. Update the admission with the pdf_url
    const { error: pdfUpdateError } = await supabaseAdmin
      .from('admissions')
      .update({ pdf_url: pdfUrl })
      .eq('ref_no', ref_no);

    if (pdfUpdateError) {
      console.error('Error updating pdf_url:', pdfUpdateError);
      // Not a fatal error – admission is already signed
      // You may still return success but log the issue
    }

    return NextResponse.json({ success: true, pdf_url: pdfUrl });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}