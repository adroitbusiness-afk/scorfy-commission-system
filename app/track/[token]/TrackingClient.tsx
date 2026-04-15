'use client';
import { CheckCircle, Clock, AlertCircle, Mail, Phone, MapPin, Calendar } from 'lucide-react';

export default function TrackingClient({ application }: { application: any }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="text-yellow-500" size={24} />;
      case 'under_review': return <AlertCircle className="text-blue-500" size={24} />;
      case 'accepted': return <CheckCircle className="text-green-500" size={24} />;
      case 'rejected': return <AlertCircle className="text-red-500" size={24} />;
      default: return <Clock size={24} />;
    }
  };

  const statusMap: Record<string, string> = {
    submitted: 'Application Submitted',
    under_review: 'Under Review',
    accepted: 'Accepted',
    rejected: 'Rejected',
  };
  const statusText = statusMap[String(application.application_status)] || String(application.application_status);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <h1 className="text-2xl font-bold">Application Status</h1>
            <p className="text-white/80">Track your application progress</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              {getStatusIcon(application.application_status)}
              <div>
                <h2 className="font-semibold text-lg">Current Status: {statusText}</h2>
                <p className="text-sm text-gray-500">Last updated: {new Date(application.submitted_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Application Details</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div><strong>Full Name:</strong> {application.full_name}</div>
                <div><strong>Email:</strong> <Mail className="inline w-3 h-3" /> {application.email}</div>
                <div><strong>Phone:</strong> <Phone className="inline w-3 h-3" /> {application.phone}</div>
                <div><strong>Program:</strong> {application.institution_programs?.program_name}</div>
                <div><strong>Institution:</strong> {application.institutions?.institution_name}</div>
                <div><strong>Submitted:</strong> <Calendar className="inline w-3 h-3" /> {new Date(application.submitted_at).toLocaleDateString()}</div>
              </div>
            </div>

            {application.address && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Address</h3>
                <p className="text-sm"><MapPin className="inline w-3 h-3 mr-1" /> {application.address}</p>
              </div>
            )}

            {application.additional_info && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Additional Information</h3>
                <p className="text-sm">{JSON.stringify(application.additional_info)}</p>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
              <strong>Note:</strong> If your application status hasn't changed in 2 weeks, please contact the admissions office.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
