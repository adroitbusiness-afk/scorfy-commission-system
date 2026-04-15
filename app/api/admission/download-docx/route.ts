import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const refNo = url.searchParams.get('ref');
  if (!refNo) {
    return NextResponse.json({ error: 'Missing reference number' }, { status: 400 });
  }

  const { data: admission, error } = await supabaseAdmin
    .from('admissions')
    .select('docx_url')
    .eq('ref_no', refNo)
    .single();

  if (error || !admission?.docx_url) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const response = await fetch(admission.docx_url);
  if (!response.ok) {
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }

  const blob = await response.blob();
  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="admission_${refNo}.docx"`,
    },
  });
}