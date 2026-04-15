'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { QRCodeCanvas } from 'qrcode.react';
import { Eye, Download, RefreshCw } from 'lucide-react';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('student_applications')
      .select('*, institutions(*), institution_programs(*)')
      .order('submitted_at', { ascending: false });
    if (!error) setApplications(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('student_applications').update({ application_status: status }).eq('id', id);
    fetchApplications();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Applications</h1>
      <button onClick={fetchApplications} className="mb-4 px-3 py-1 bg-blue-600 text-white rounded-lg"><RefreshCw size={16} className="inline mr-1" /> Refresh</button>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead className="bg-gray-50">
            <tr><th className="p-3 text-left">Name</th><th>Program</th><th>Status</th><th>Submitted</th><th>QR</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {applications.map((app: any) => (
              <tr key={app.id} className="border-t">
                <td className="p-3">{app.full_name}<br/><span className="text-xs text-gray-500">{app.email}</span></td>
                <td className="p-3">{app.institution_programs?.program_name}</td>
                <td className="p-3">
                  <select value={app.application_status} onChange={(e) => updateStatus(app.id, e.target.value)} className="border rounded p-1">
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </td>
                <td className="p-3">{new Date(app.submitted_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <QRCodeCanvas value={`${window.location.origin}/track/${app.tracking_token}`} size={40} />
                </td>
                <td className="p-3">
                  <a href={`/track/${app.tracking_token}`} target="_blank" className="text-blue-600"><Eye size={16} /></a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
