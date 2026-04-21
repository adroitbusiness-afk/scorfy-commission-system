import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { institution_id } = await req.json();
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get institution and user details
    const { data: institution } = await supabaseAdmin
      .from('institutions')
      .select('*, profiles!created_by(email, full_name)')
      .eq('id', institution_id)
      .single();

    if (!institution) return NextResponse.json({ error: 'Institution not found' }, { status: 404 });

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;
    const drawText = (text: string, size: number, isBold = false) => {
      const usedFont = isBold ? boldFont : font;
      page.drawText(text, { x: 50, y, size, font: usedFont });
      y -= size + 4;
    };

    drawText('GLOBAL SMART RECRUITMENT', 16, true);
    drawText('INSTITUTION SUBSCRIPTION AGREEMENT', 14, true);
    y -= 10;
    drawText(`Institution: ${institution.institution_name}`, 12);
    drawText(`Signed by: ${institution.profiles?.full_name || 'Admin'}`, 12);
    drawText(`Email: ${institution.profiles?.email || institution.email}`, 12);
    drawText(`Date: ${new Date().toLocaleDateString('en-GB')}`, 12);
    y -= 10;
    drawText('Pricing Terms:', 12, true);
    drawText('- Base monthly subscription (3 users): K3,900', 11);
    drawText('- Additional user (beyond 3): K490 per month', 11);
    drawText('- First 30 days: Free trial', 11);
    y -= 15;
    drawText('By signing below, the institution agrees to the full terms of this agreement.', 10);
    y -= 20;
    drawText('_________________________________________', 10);
    drawText('Electronic Signature (Institution Admin)', 10);
    y -= 20;
    drawText('For Adroit Business Solutions', 10);
    drawText('_________________________________________', 10);
    drawText('Authorized Signatory', 10);

    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Upload to Supabase Storage
    const fileName = `institution_agreements/${institution_id}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('institution-documents')
      .upload(fileName, pdfBuffer, { contentType: 'application/pdf' });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('institution-documents')
      .getPublicUrl(fileName);

    // Save record in database
    const { error: dbError } = await supabaseAdmin
      .from('institution_agreements')
      .insert({
        institution_id,
        signed_by: institution.created_by,
        pdf_url: publicUrl,
        ip_address: req.headers.get('x-forwarded-for') || req.ip,
        user_agent: req.headers.get('user-agent'),
      });
    if (dbError) throw dbError;

    return NextResponse.json({ success: true, pdfUrl: publicUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save agreement' }, { status: 500 });
  }
}