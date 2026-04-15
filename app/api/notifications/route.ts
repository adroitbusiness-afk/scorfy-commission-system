import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Notification {
  type: 'application_submitted' | 'application_approved' | 'payment_pending' | 'payment_approved' | 'commission_created' | 'commission_paid';
  recipientId: string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const notification: Notification = await req.json();

    // Save notification to database
    const { data: savedNotification, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: notification.recipientId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        action_url: notification.actionUrl,
        related_id: notification.relatedId,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Send email notification for important events
    if (['payment_pending', 'commission_paid', 'application_approved'].includes(notification.type)) {
      // TODO: Integrate with email service
      console.log(`Email notification sent: ${notification.title}`);
    }

    return NextResponse.json({
      success: true,
      notificationId: savedNotification.id,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const limit = req.nextUrl.searchParams.get('limit') || '10';
    const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(req: NextRequest) {
  try {
    const { notificationId, isRead } = await req.json();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: isRead })
      .eq('id', notificationId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Notification updated',
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}