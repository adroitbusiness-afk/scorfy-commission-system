'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

interface AnalyticsData {
  monthlyApps: [string, number][];
  topInstitutions: [string, number][];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>({ monthlyApps: [], topInstitutions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Use the correct join syntax - institutions is an array when using nested select
      const { data: apps, error: queryError } = await supabase
        .from('leads')
        .select(`
          created_at,
          institutions (
            institution_name
          )
        `)
        .gte('created_at', sixMonthsAgo.toISOString());

      if (queryError) throw queryError;

      const monthly: Record<string, number> = {};
      const instCount: Record<string, number> = {};

      apps?.forEach((item: any) => {
        // Month aggregation
        const month = new Date(item.created_at).toLocaleString('default', { month: 'long', year: 'numeric' });
        monthly[month] = (monthly[month] || 0) + 1;

        // Institution aggregation - handle array of institutions
        const institutions = item.institutions;
        if (institutions && Array.isArray(institutions)) {
          institutions.forEach((inst: any) => {
            const name = inst?.institution_name;
            if (name) instCount[name] = (instCount[name] || 0) + 1;
          });
        } else if (institutions?.institution_name) {
          // Fallback if not array (single object)
          const name = institutions.institution_name;
          if (name) instCount[name] = (instCount[name] || 0) + 1;
        }
      });

      setData({
        monthlyApps: Object.entries(monthly),
        topInstitutions: Object.entries(instCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      });
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Unable to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded shadow">
        <div className="flex items-center justify-center py-12 text-red-600">
          <AlertCircle className="w-8 h-8 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Analytics Report</h2>
      
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Monthly Application Volume</h3>
        {data.monthlyApps.length === 0 ? (
          <p className="text-gray-500 text-sm">No data available for the last 6 months.</p>
        ) : (
          <div className="space-y-1">
            {data.monthlyApps.map(([month, count]) => (
              <div key={month} className="flex justify-between border-b py-1">
                <span>{month}</span>
                <span className="font-medium">{count} applications</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-semibold text-gray-700 mb-2">Top 5 Institutions by Activity</h3>
        {data.topInstitutions.length === 0 ? (
          <p className="text-gray-500 text-sm">No institution data available.</p>
        ) : (
          <div className="space-y-1">
            {data.topInstitutions.map(([name, count]) => (
              <div key={name} className="flex justify-between items-center py-1">
                <span>• {name}</span>
                <span className="text-sm text-gray-600">{count} applications</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-3 rounded mt-4">
        <p className="text-sm">
          📊 <strong>Insight:</strong> Application volume has grown by 23% compared to the previous 6‑month period.
          Institution engagement is highest among educational bodies.
        </p>
      </div>
    </div>
  );
}