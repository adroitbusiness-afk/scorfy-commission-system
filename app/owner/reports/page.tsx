'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RefreshCw, FileText, Eye } from 'lucide-react';

export default function LiveReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    const { data } = await supabase.from('live_reports').select('*').order('generated_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Live Recruiter Reports</h1>
      <button onClick={fetchReports} className="mb-4 px-3 py-1 bg-blue-600 text-white rounded-lg"><RefreshCw size={16} className="inline mr-1" /> Refresh</button>
      <div className="space-y-4">
        {reports.map((report: any) => (
          <div key={report.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-center">
              <div><FileText className="inline mr-2" /> {report.report_type} – {new Date(report.generated_at).toLocaleString()}</div>
              <button onClick={() => alert(JSON.stringify(report.data, null, 2))} className="text-blue-600"><Eye size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}