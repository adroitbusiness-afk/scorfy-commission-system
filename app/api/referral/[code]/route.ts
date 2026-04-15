import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code;

  // Redirect to the admission landing page for this referral code
  return NextResponse.redirect(new URL(`/admission/${encodeURIComponent(code)}`, req.url));
}