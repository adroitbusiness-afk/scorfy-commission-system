'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  program: string;
  status: string;
  created_at: string;
  admission_letter_url?: string;
  documents?: any[];
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAcceptanceLetter = async (applicationId: string) => {
    setGenerating(applicationId);
    try {
      const response = await fetch(`/api/generate-acceptance-letter/${applicationId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate acceptance letter');
      }

      const result = await response.json();
      alert('Acceptance letter generated successfully!');

      // Refresh applications to show the new PDF URL
      fetchApplications();
    } catch (error) {
      console.error('Error generating acceptance letter:', error);
      alert('Failed to generate acceptance letter');
    } finally {
      setGenerating(null);
    }
  };

  const getProgramName = (programCode: string) => {
    const programs = {
      'nursing-bs': 'Bachelor of Science in Nursing',
      'business-bba': 'Bachelor of Business Administration',
      'it-bs': 'Bachelor of Information Technology',
      'education-bachelor': 'Bachelor of Education',
      'nursing-diploma': 'Diploma in Nursing'
    };
    return programs[programCode as keyof typeof programs] || programCode;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Applications Management</h1>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{app.full_name}</div>
                    <div className="text-sm text-gray-500">{app.email}</div>
                    <div className="text-sm text-gray-500">{app.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getProgramName(app.program)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      app.status === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : app.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {app.status === 'pending' && (
                        <button
                          onClick={() => generateAcceptanceLetter(app.id)}
                          disabled={generating === app.id}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                        >
                          {generating === app.id ? 'Generating...' : 'Accept & Generate Letter'}
                        </button>
                      )}
                      {app.admission_letter_url && (
                        <a
                          href={app.admission_letter_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          View Letter
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {applications.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No applications found.</p>
        </div>
      )}
    </div>
  );
}