import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const { institutionId, title, content, imageUrl, scheduleFor } = await req.json();

    // Create news item
    const { data: newsItem, error } = await supabase
      .from('institution_news')
      .insert({
        institution_id: institutionId,
        title,
        content,
        image_url: imageUrl,
        is_published: !scheduleFor,
        scheduled_for: scheduleFor || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // If published immediately, send broadcasts to students
    if (!scheduleFor) {
      await supabase.from('institution_messages').insert({
        institution_id: institutionId,
        title: `📰 ${title}`,
        message: content,
        audience_type: 'all',
        channel: 'email',
        recipient_count: 0,
        sent_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      newsId: newsItem.id,
      message: scheduleFor ? 'News scheduled for publication' : 'News published',
    });
  } catch (error) {
    console.error('Error creating news:', error);
    return NextResponse.json(
      { error: 'Failed to create news' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { institutionId } = await params;

    const { data: news, error } = await supabase
      .from('institution_news')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      news,
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}