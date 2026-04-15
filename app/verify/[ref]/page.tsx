import { supabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import { CheckCircle, FileText, Building2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ ref: string }> | { ref: string };
}

export default async function VerifyPage({ params }: PageProps) {
  const resolvedParams = await params;
  const ref = resolvedParams.ref;

  const { data: admission, error } = await supabase
    .from('admissions')
    .select('*')
    .eq('ref_no', ref)
    .single();

  if (error || !admission) {
    notFound();
  }

  const isSigned = admission.status === 'confirmed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <Building2 className="w-20 h-20 mx-auto text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">DMI-St. Eugene University</h1>
          <p className="text-gray-500 mt-2">Admission Verification Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Admission Letter Details</h2>
            <p className="text-sm text-gray-500">Reference: {admission.ref_no}</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Student Name</label><p className="font-medium">{admission.student_name}</p></div>
              <div><label className="text-sm text-gray-500">Phone</label><p className="font-medium">{admission.student_phone}</p></div>
              <div><label className="text-sm text-gray-500">Email</label><p className="font-medium">{admission.student_email}</p></div>
              <div><label className="text-sm text-gray-500">National ID</label><p className="font-medium">{admission.national_id}</p></div>
              <div><label className="text-sm text-gray-500">Programme</label><p className="font-medium">{admission.program}</p></div>
              <div><label className="text-sm text-gray-500">Mode of Study</label><p className="font-medium">{admission.mode_of_study || 'Full-time'}</p></div>
              <div><label className="text-sm text-gray-500">Recruiter</label><p className="font-medium">{admission.reference_person || '—'}</p></div>
            </div>

            <div className="border-t pt-4 flex flex-wrap justify-between items-center gap-3">
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${isSigned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {isSigned ? <CheckCircle className="w-4 h-4" /> : null}
                  {isSigned ? 'Confirmed' : 'Pending Confirmation'}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Payment</label>
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${admission.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {admission.payment_status === 'paid' ? 'Paid' : 'Pending'}
                </div>
              </div>
            </div>

            {isSigned && admission.pdf_url && (
              <div className="mt-4">
                <a href={admission.pdf_url} download className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                  <FileText className="w-4 h-4" /> Download Signed PDF
                </a>
              </div>
            )}

            {!isSigned && (
              <form action="/api/admission/sign" method="POST" className="mt-4">
                <input type="hidden" name="ref_no" value={admission.ref_no} />
                <input type="hidden" name="signer_id" value="vc-mock-id" />
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  Sign as Vice Chancellor (Confirm Enrollment)
                </button>
              </form>
            )}
          </div>

          <div className="bg-gray-50 p-4 border-t text-center">
            <Link href="/student/dashboard" className="inline-flex items-center gap-2 text-blue-600 hover:underline">
              <ExternalLink className="w-4 h-4" /> Go to Student Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}