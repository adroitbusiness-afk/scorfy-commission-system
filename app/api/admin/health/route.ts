import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Mock health checks - in real implementation, this would perform actual health checks
    const healthChecks = [
      {
        service: 'Database',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: 45,
        details: 'All connections healthy'
      },
      {
        service: 'API Server',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: 120,
        details: 'All endpoints responding'
      },
      {
        service: 'Storage',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        details: 'Bucket accessible, 2.3GB used'
      },
      {
        service: 'Email Service',
        status: 'warning',
        lastCheck: new Date().toISOString(),
        responseTime: 200,
        details: 'Rate limit approaching (80% used)'
      },
      {
        service: 'Payment Gateway',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: 150,
        details: 'All transactions processing'
      },
      {
        service: 'Notification Queue',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        details: '5 messages queued, processing normally'
      }
    ];

    const overallStatus = healthChecks.some(h => h.status === 'critical') ? 'critical' :
                         healthChecks.some(h => h.status === 'warning') ? 'warning' : 'healthy';

    return NextResponse.json({
      status: overallStatus,
      checks: healthChecks,
      timestamp: new Date().toISOString(),
      uptime: '5d 2h 15m',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'critical',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
