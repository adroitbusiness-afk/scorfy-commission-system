// app/api/generate-institution-acceptance-letter/[applicationId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'; // simpler alternative to jsPDF
// or use @react-pdf/renderer – I'll use pdf-lib for this example

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch application with correct joins
    const { data: application, error: appError } = await supabaseAdmin
      .from('institution_applications')
      .select(`
        *,
        leads:lead_id (name, email),
        institution_programs:program_id (program_name, fee_per_year),
        institutions:institution_id (institution_name, institution_code)
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('Application fetch error:', appError);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const program = application.institution_programs;
    const institution = application.institutions;
    const student = application.leads;

    // Create PDF using pdf-lib (runs on Node.js without canvas)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    // Helper to draw text
    const drawText = (text: string, size: number, isBold = false, x = 50) => {
      const usedFont = isBold ? boldFont : font;
      page.drawText(text, { x, y, size, font: usedFont });
      y -= size + 4;
    };

    // Header
    drawText(institution.institution_name, 18, true, 50);
    drawText('OFFICIAL ACCEPTANCE LETTER', 16, true, 50);
    y -= 10;
    drawText(`Date: ${new Date().toLocaleDateString('en-GB')}`, 12);
    y -= 10;
    drawText(`Dear ${student.name},`, 12);
    y -= 8;
    drawText(`We are pleased to inform you that your application to ${institution.institution_name} has been approved.`, 12);
    y -= 12;
    drawText('Admission Details:', 12, true);
    drawText(`Program: ${program.program_name}`, 12);
    drawText(`Annual Tuition Fee: K${program.fee_per_year?.toLocaleString() || 'TBD'}`, 12);
    drawText(`Semester Fee: K${((program.fee_per_year || 0) / 2).toLocaleString()}`, 12);
    y -= 10;
    drawText('Payment Schedule:', 12, true);
    drawText('- Semester 1: Due within 2 weeks of registration', 11);
    drawText('- Semester 2: Due before start of second semester', 11);
    y -= 10;
    drawText('Important Notes:', 12, true);
    drawText('1. Conditional upon meeting all admission requirements.', 11);
    drawText('2. Complete registration and fee payment to secure your place.', 11);
    drawText('3. Contact the admissions office for any questions.', 11);
    y -= 15;
    drawText('Congratulations on your acceptance!', 12);
    y -= 20;
    drawText('Sincerely,', 12);
    y -= 30;
    drawText(`${institution.institution_name} Admissions Office`, 11);

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Upload to Supabase Storage
    const fileName = `acceptance_letters/${institution.institution_code}_${applicationId}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('institution-documents') // make sure this bucket exists
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('institution-documents')
      .getPublicUrl(fileName);

    // Update application with PDF URL
    const { error: updateError } = await supabaseAdmin
      .from('institution_applications')
      .update({ admission_letter_url: publicUrl })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Update error:', updateError);
      // Not fatal, but log
    }

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      message: 'Acceptance letter generated'
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}