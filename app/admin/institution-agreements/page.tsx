'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function AdminAgreements() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('institution_agreements')
      .select('*, institutions(institution_name), profiles(full_name)')
      .then(({ data }) => {
        setAgreements(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Institution Agreements</h1>
      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead className="bg-gray-50">
            <tr><th className="p-2">Institution</th><th>Signed By</th><th>Date</th><th>PDF</th></tr>
          </thead>
          <tbody>
            {agreements.map(ag => (
              <tr key={ag.id} className="border-t">
                <td className="p-2">{ag.institutions?.institution_name}</td>
                <td>{ag.profiles?.full_name || ag.signed_by}</td>
                <td>{new Date(ag.signed_at).toLocaleDateString()}</td>
                <td><a href={ag.pdf_url} target="_blank" className="text-blue-600">View</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}