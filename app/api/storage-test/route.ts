import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey);
}

export async function GET(req: NextRequest) {
  // Check admin authentication
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json(
        {
          error: 'Missing Supabase environment variables',
          required: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const test = searchParams.get('test') || 'all';

    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: List buckets
    if (test === 'all' || test === 'buckets') {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      results.tests.buckets = {
        status: error ? 'FAIL' : 'PASS',
        found: buckets?.length || 0,
        hasDocuments: buckets?.some(b => b.name === 'documents') || false,
        error: error?.message
      };
    }

    // Test 2: Access documents bucket
    if (test === 'all' || test === 'access') {
      const { data, error } = await supabase.storage
        .from('documents')
        .list('', { limit: 1 });

      results.tests.access = {
        status: error ? 'FAIL' : 'PASS',
        canList: !error,
        error: error?.message
      };
    }

    // Test 3: Database connection
    if (test === 'all' || test === 'database') {
      const { data, error } = await supabase
        .from('profiles')
        .select('count(*)', { count: 'exact', head: true });

      results.tests.database = {
        status: error ? 'FAIL' : 'PASS',
        connected: !error,
        error: error?.message
      };
    }

    const allPassed = Object.values(results.tests).every((t: any) => t.status === 'PASS');

    return NextResponse.json({
      ...results,
      summary: {
        allTestsPassed: allPassed,
        totalTests: Object.keys(results.tests).length,
        passedTests: Object.values(results.tests).filter((t: any) => t.status === 'PASS').length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Storage test failed',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
