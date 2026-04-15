import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const refNo = formData.get('ref_no') as string;
  const signerId = formData.get('signer_id') as string;

  if (!refNo || !signerId) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('admissions')
    .update({
      status: 'confirmed',
      signed_by: signerId,
      signed_at: new Date().toISOString(),
    })
    .eq('ref_no', refNo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Redirect back to the verify page
  return NextResponse.redirect(new URL(`/verify/${refNo}`, req.url));
}