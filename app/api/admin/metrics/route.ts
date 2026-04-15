import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Mock system metrics - in real implementation, this would query actual system metrics
    const metrics = {
      database: {
        connections: 23,
        responseTime: 45,
        uptime: 99.9,
        status: 'healthy'
      },
      api: {
        endpoints: 15,
        avgResponseTime: 120,
        errorRate: 0.1,
        status: 'healthy'
      },
      storage: {
        used: 2.3,
        total: 10,
        status: 'healthy'
      },
      notifications: {
        queued: 5,
        sent: 1247,
        failed: 3
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch system metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system metrics' },
      { status: 500 }
    );
  }
}
