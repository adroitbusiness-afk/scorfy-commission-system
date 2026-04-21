import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function GET() {
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
  drawText('INSTITUTION SUBSCRIPTION AGREEMENT (Preview)', 12, true);
  y -= 20;
  drawText('Pricing:', 12, true);
  drawText('Base monthly (3 users): K3,900', 11);
  drawText('Additional user: K490/month', 11);
  drawText('30-day free trial', 11);
  // ... add full agreement text here for preview

  const pdfBytes = await pdfDoc.save();
  // Convert Uint8Array to Buffer (Node.js environment)
  const buffer = Buffer.from(pdfBytes);
  return new NextResponse(buffer, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="agreement_preview.pdf"' }
  });
}