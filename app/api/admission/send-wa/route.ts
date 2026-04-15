import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { ref_no, phoneNumber } = await req.json();
    if (!ref_no) {
      return NextResponse.json({ error: 'Missing reference number' }, { status: 400 });
    }

    const { data: admission, error } = await supabaseAdmin
      .from('admissions')
      .select('ref_no, student_name, program')
      .eq('ref_no', ref_no)
      .single();

    if (error || !admission) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }

    const targetPhone = phoneNumber || '+260955201532';
    const cleanPhone = targetPhone.replace(/[^+\d]/g, '');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyLink = `${baseUrl}/verify/${ref_no}`;
    const downloadLink = `${baseUrl}/api/admission/download-docx?ref=${ref_no}`;

    const message = `🏫 *DMI-St. Eugene University Admission Letter*\n\nReference: ${ref_no}\nStudent: ${admission.student_name}\nProgram: ${admission.program}\n\n🔗 Verify: ${verifyLink}\n\n📄 Download DOCX: ${downloadLink}\n\nPlease confirm your enrollment.`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    return NextResponse.json({ success: true, waUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}