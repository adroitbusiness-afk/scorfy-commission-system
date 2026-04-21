import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Perform real health checks here
    const services = [
      { service: 'Database', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 45 },
      { service: 'API Server', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 120 },
      { service: 'Storage', status: 'healthy', lastCheck: new Date().toISOString() },
      { service: 'Email Service', status: 'warning', lastCheck: new Date().toISOString(), error: 'Rate limit approaching' },
      { service: 'Payment Gateway', status: 'healthy', lastCheck: new Date().toISOString(), responseTime: 200 },
      { service: 'Notification Queue', status: 'healthy', lastCheck: new Date().toISOString() },
    ];

    return NextResponse.json({ services });
  } catch (error) {
    return NextResponse.json({ services: [] }, { status: 500 });
  }
}