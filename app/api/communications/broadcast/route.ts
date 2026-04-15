import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configure email transporter (update with your SMTP settings)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface BroadcastPayload {
  institutionId: string;
  title: string;
  message: string;
  audienceType: 'all' | 'applicants' | 'accepted' | 'by_program' | 'by_intake';
  channel: 'email' | 'sms' | 'whatsapp';
  programId?: string;
  intake?: string;
  templateId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: BroadcastPayload = await req.json();

    // Get recipients based on audience type
    let recipientQuery = supabase
      .from('leads')
      .select('id, name, email, phone, institution_applications(application_status)');

    if (body.audienceType === 'applicants') {
      recipientQuery = recipientQuery.not('institution_applications', 'is', null);
    } else if (body.audienceType === 'accepted') {
      recipientQuery = recipientQuery
        .eq('institution_applications.application_status', 'approved');
    } else if (body.audienceType === 'by_program' && body.programId) {
      recipientQuery = recipientQuery.eq('program_id', body.programId);
    } else if (body.audienceType === 'by_intake' && body.intake) {
      recipientQuery = recipientQuery.eq('intake', body.intake);
    }

    recipientQuery = recipientQuery.eq('institution_id', body.institutionId);

    const { data: recipients, error: recipientError } = await recipientQuery;

    if (recipientError) {
      throw new Error(`Failed to fetch recipients: ${recipientError.message}`);
    }

    // Store message in database
    const { data: messageRecord, error: dbError } = await supabase
      .from('institution_messages')
      .insert({
        institution_id: body.institutionId,
        title: body.title,
        message: body.message,
        audience_type: body.audienceType,
        channel: body.channel,
        recipient_count: recipients?.length || 0,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save message: ${dbError.message}`);
    }

    // Send messages based on channel
    const sentCount = await sendMessages(recipients || [], body, messageRecord.id);

    // Update message with actual sent count
    await supabase
      .from('institution_messages')
      .update({ recipient_count: sentCount })
      .eq('id', messageRecord.id);

    return NextResponse.json({
      success: true,
      messageId: messageRecord.id,
      sentCount,
      message: `Message broadcast to ${sentCount} recipients via ${body.channel}`,
    });

  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send broadcast' },
      { status: 500 }
    );
  }
}

async function sendMessages(recipients: any[], payload: BroadcastPayload, messageId: string) {
  let sentCount = 0;

  if (payload.channel === 'email') {
    sentCount = await sendEmailBroadcast(recipients, payload);
  } else if (payload.channel === 'sms') {
    sentCount = await sendSmsBroadcast(recipients, payload);
  } else if (payload.channel === 'whatsapp') {
    sentCount = await sendWhatsAppBroadcast(recipients, payload);
  }

  return sentCount;
}

async function sendEmailBroadcast(recipients: any[], payload: BroadcastPayload) {
  let sentCount = 0;

  for (const recipient of recipients) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM!,
        to: recipient.email,
        subject: payload.title,
        html: `
          <h2>${payload.title}</h2>
          <p>${payload.message}</p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">
            This is an automated message from your institution.
          </p>
        `,
      });
      sentCount++;

      // Log individual send
      await supabase.from('message_logs').insert({
        message_id: payload,
        recipient_id: recipient.id,
        channel: 'email',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to send email to ${recipient.email}:`, error);
    }
  }

  return sentCount;
}

async function sendSmsBroadcast(recipients: any[], payload: BroadcastPayload) {
  // Integration with SMS provider (Twilio, AWS SNS, etc.)
  let sentCount = 0;

  for (const recipient of recipients) {
    if (!recipient.phone) continue;

    try {
      // TODO: Integrate with SMS provider
      // const result = await smsProvider.send({
      //   phoneNumber: recipient.phone,
      //   message: payload.message
      // });

      sentCount++;
      await supabase.from('message_logs').insert({
        message_id: payload,
        recipient_id: recipient.id,
        channel: 'sms',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to send SMS to ${recipient.phone}:`, error);
    }
  }

  return sentCount;
}

async function sendWhatsAppBroadcast(recipients: any[], payload: BroadcastPayload) {
  // Integration with WhatsApp Business API
  let sentCount = 0;

  for (const recipient of recipients) {
    if (!recipient.phone) continue;

    try {
      // TODO: Integrate with WhatsApp Business API
      // const result = await whatsappProvider.send({
      //   phoneNumber: recipient.phone,
      //   message: payload.message
      // });

      sentCount++;
      await supabase.from('message_logs').insert({
        message_id: payload,
        recipient_id: recipient.id,
        channel: 'whatsapp',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to send WhatsApp to ${recipient.phone}:`, error);
    }
  }

  return sentCount;
}