import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { analyzeLead } from '@/lib/aiLeadEngine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

function getProgramDuration(program: string): string {
  if (program.includes('Bachelor') || program.includes('BSc') || program.includes('BA')) return '4 Years';
  if (program.includes('Master') || program.includes('MSc') || program.includes('MBA')) return '2 Years';
  if (program.includes('Diploma')) return '2 Years';
  if (program.includes('PhD')) return '3 Years';
  return 'Varies';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      student_name,
      student_phone,
      student_email,
      national_id,
      program,
      mode_of_study,
      institution_id,
      reference_person,
      recruiter_id,
    } = body;

    // 1. Check if already admitted
    const { data: existingAdmission } = await supabaseAdmin
      .from('admissions')
      .select('ref_no, student_name, program, status, payment_status, reference_person, created_at')
      .or(`national_id.eq.${national_id},student_email.eq.${student_email}`)
      .maybeSingle();

    if (existingAdmission) {
      return NextResponse.json({ alreadyAdmitted: true, admission: existingAdmission });
    }

    // 2. Lead management
    let leadId: string | null = null;
    if (student_email || student_phone || national_id) {
      const orFilters = [];
      if (student_email) orFilters.push(`email.eq.${student_email}`);
      if (student_phone) orFilters.push(`phone.eq.${student_phone}`);
      if (national_id) orFilters.push(`notes.ilike.%${national_id}%`);
      if (orFilters.length) {
        const { data } = await supabaseAdmin
          .from('leads')
          .select('id')
          .or(orFilters.join(','))
          .maybeSingle();
        if (data) leadId = data.id;
      }
    }

    if (!leadId) {
      const analysis = analyzeLead({
        name: student_name,
        email: student_email || '',
        phone: student_phone || '',
        notes: `${program} - ${mode_of_study} - National ID: ${national_id || 'N/A'}`,
        country: null,
      });

      // Store tags as a plain comma‑separated string (not PostgreSQL array)
      const tagsString = (analysis.tags || []).join(',');

      const { data: newLead, error: leadError } = await supabaseAdmin
        .from('leads')
        .insert({
          name: student_name,
          email: student_email || null,
          phone: student_phone || null,
          notes: `${program} - ${mode_of_study} - National ID: ${national_id || 'N/A'}`,
          program: program,
          institution_id: institution_id || null,
          assigned_recruiter: recruiter_id || null,
          status: 'new',
          lead_score: analysis.score,
          intent: analysis.intent,
          priority: analysis.priority,
          recommended_action: analysis.action,
          tags: tagsString || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (leadError) {
        console.error('Lead creation error:', leadError);
        return NextResponse.json({ error: 'Failed to create lead: ' + leadError.message }, { status: 500 });
      }
      leadId = newLead.id;
    }

    // Mark lead as converted
    await supabaseAdmin
      .from('leads')
      .update({ status: 'converted', updated_at: new Date().toISOString() })
      .eq('id', leadId);

    // 3. Admission generation
    let institutionName = 'DMI-St. Eugene University';
    if (institution_id) {
      const { data: inst } = await supabaseAdmin
        .from('institutions')
        .select('institution_name')
        .eq('id', institution_id)
        .single();
      if (inst) institutionName = inst.institution_name;
    }

    const { data: refData } = await supabaseAdmin.rpc('generate_admission_ref');
    const refNo = refData;
    const currentDate = new Date().toLocaleDateString('en-GB');

    const qrBuffer = await QRCode.toBuffer(`${process.env.NEXT_PUBLIC_APP_URL}/verify/${refNo}`, {
      width: 200,
      margin: 1,
    });

    const templatePath = path.join(process.cwd(), 'public', 'templates', 'dmi_admission_template.docx');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Template file not found' }, { status: 500 });
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const imageModule = new ImageModule({
      getImage: () => qrBuffer,
      getSize: () => [150, 150],
    });
    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData({
      ref_no: refNo,
      student_name,
      student_phone,
      student_email,
      national_id,
      program,
      mode_of_study,
      date: currentDate,
      reference_person,
      institution_name: institutionName,
      admission_type: 'Provisional Admission',
      campus: 'Great North Road Campus',
      duration: getProgramDuration(program),
      payment_deadline: '30 days from admission',
      initial_payment: 'K2,000',
      qr_code: 'qr_code',
    });

    doc.render();
    const buf = doc.getZip().generate({ type: 'nodebuffer' });

    const fileName = `admissions/${refNo}.docx`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('admission-docs')
      .upload(fileName, buf, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('admission-docs').getPublicUrl(fileName);
    const docxUrl = urlData.publicUrl;

    const { data: newAdmission, error: insertError } = await supabaseAdmin
      .from('admissions')
      .insert({
        ref_no: refNo,
        student_name,
        student_phone,
        student_email,
        national_id,
        program,
        mode_of_study,
        institution_id,
        reference_person,
        admitted_by: recruiter_id,
        lead_id: leadId,
        status: 'pending',
        payment_status: 'pending',
        docx_url: docxUrl,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, admission: newAdmission });
  } catch (error: any) {
    console.error('Admission generation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}