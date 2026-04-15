import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Lazy initialization – store as any to avoid type issues
let supabaseAdmin: any = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseAdmin;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const refNo = formData.get('ref_no') as string;
  const signerId = formData.get('signer_id') as string;

  if (!refNo || !signerId) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Cast the whole operation to any to avoid the 'never' type error
  const { error } = await (supabase
    .from('admissions')
    .update({
      status: 'confirmed',
      signed_by: signerId,
      signed_at: new Date().toISOString(),
    })
    .eq('ref_no', refNo) as any);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Redirect back to the verify page
  return NextResponse.redirect(new URL(`/verify/${refNo}`, req.url));
}