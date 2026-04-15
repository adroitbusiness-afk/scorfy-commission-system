import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    // Get application details
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        student:student_id (
          full_name,
          email,
          phone
        ),
        institution:institution_id (
          institution_name,
          institution_code
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Get program details
    const programs = {
      'nursing-bs': {
        name: 'Bachelor of Science in Nursing',
        duration: '4 years',
        feePerYear: 18000,
        commissionPerSemester: 500
      },
      'business-bba': {
        name: 'Bachelor of Business Administration',
        duration: '4 years',
        feePerYear: 16000,
        commissionPerSemester: 500
      },
      'it-bs': {
        name: 'Bachelor of Information Technology',
        duration: '4 years',
        feePerYear: 17000,
        commissionPerSemester: 500
      },
      'education-bachelor': {
        name: 'Bachelor of Education',
        duration: '4 years',
        feePerYear: 15000,
        commissionPerSemester: 500
      },
      'nursing-diploma': {
        name: 'Diploma in Nursing',
        duration: '3 years',
        feePerYear: 12000,
        commissionPerSemester: 500
      }
    };

    const program = programs[application.program as keyof typeof programs];
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 400 });
    }

    // Generate PDF
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DMI St Eugene University', 105, 30, { align: 'center' });

    doc.setFontSize(16);
    doc.text('OFFICIAL ACCEPTANCE LETTER', 105, 45, { align: 'center' });

    // Letter content
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    let y = 70;
    const lineHeight = 7;

    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 20, y);
    y += lineHeight * 2;

    doc.text(`Dear ${application.student.full_name},`, 20, y);
    y += lineHeight * 2;

    doc.text('We are pleased to inform you that your application for admission to DMI St Eugene University', 20, y);
    y += lineHeight;
    doc.text('has been reviewed and approved.', 20, y);
    y += lineHeight * 2;

    doc.text('Admission Details:', 20, y);
    y += lineHeight;

    doc.text(`Program: ${program.name}`, 30, y);
    y += lineHeight;
    doc.text(`Duration: ${program.duration}`, 30, y);
    y += lineHeight;
    doc.text(`Annual Tuition Fee: K${program.feePerYear.toLocaleString()}`, 30, y);
    y += lineHeight;
    doc.text(`Semester Fee: K${(program.feePerYear / 2).toLocaleString()}`, 30, y);
    y += lineHeight * 2;

    doc.text('Payment Schedule:', 20, y);
    y += lineHeight;
    doc.text('- Semester 1: Due within 2 weeks of registration', 30, y);
    y += lineHeight;
    doc.text('- Semester 2: Due before start of second semester', 30, y);
    y += lineHeight * 2;

    doc.text('Important Notes:', 20, y);
    y += lineHeight;
    doc.text('1. This acceptance is conditional upon meeting all admission requirements.', 30, y);
    y += lineHeight;
    doc.text('2. You must complete registration and fee payment to secure your place.', 30, y);
    y += lineHeight;
    doc.text('3. Contact the admissions office for any questions.', 30, y);
    y += lineHeight * 2;

    doc.text('Congratulations on your acceptance!', 20, y);
    y += lineHeight * 2;

    doc.text('Sincerely,', 20, y);
    y += lineHeight * 3;

    doc.text('Dr. [Admissions Director Name]', 20, y);
    y += lineHeight;
    doc.text('Director of Admissions', 20, y);
    y += lineHeight;
    doc.text('DMI St Eugene University', 20, y);

    // Convert to buffer
    const pdfBuffer = doc.output('arraybuffer');

    // Upload to Supabase storage
    const fileName = `acceptance_letters/${applicationId}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Update application with PDF URL
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        admission_letter_url: publicUrl,
        status: 'accepted'
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // Create commission records for recruiter if referred
    if (application.referred_by) {
      const { data: recruiter } = await supabase
        .from('recruiters')
        .select('id')
        .eq('referral_code', application.referred_by)
        .single();

      if (recruiter) {
        // Create commission for semester 1
        await supabase.from('commissions').insert({
          recruiter_id: recruiter.id,
          student_id: application.student_id,
          institution_id: application.institution_id,
          program: application.program,
          amount: program.commissionPerSemester,
          semester: 1,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

        // Create commission for semester 2
        await supabase.from('commissions').insert({
          recruiter_id: recruiter.id,
          student_id: application.student_id,
          institution_id: application.institution_id,
          program: application.program,
          amount: program.commissionPerSemester,
          semester: 2,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      message: 'Acceptance letter generated and commissions created'
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}