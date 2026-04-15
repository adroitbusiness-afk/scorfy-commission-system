import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { institutionId } = await params;

    // Get all messages with recipient counts
    const { data: messages, error } = await supabase
      .from('institution_messages')
      .select('*')
      .eq('institution_id', institutionId)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    // Calculate analytics
    const analytics = {
      totalMessages: messages?.length || 0,
      totalRecipients: messages?.reduce((sum, m) => sum + (m.recipient_count || 0), 0) || 0,
      byChannel: {
        email: messages?.filter(m => m.channel === 'email').length || 0,
        sms: messages?.filter(m => m.channel === 'sms').length || 0,
        whatsapp: messages?.filter(m => m.channel === 'whatsapp').length || 0,
      },
      byAudience: {
        all: messages?.filter(m => m.audience_type === 'all').length || 0,
        applicants: messages?.filter(m => m.audience_type === 'applicants').length || 0,
        accepted: messages?.filter(m => m.audience_type === 'accepted').length || 0,
        byProgram: messages?.filter(m => m.audience_type === 'by_program').length || 0,
        byIntake: messages?.filter(m => m.audience_type === 'by_intake').length || 0,
      },
    };

    return NextResponse.json({
      success: true,
      messages,
      analytics,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}