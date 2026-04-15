'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, CheckCircle, AlertCircle, Building2, Download, Send, FileText } from 'lucide-react';

// Full program list from DMI-St. Eugene University image
const PROGRAMS = {
  bachelors: [
    "Bachelor of Engineering in Computer Science (5 Years)",
    "Bachelor of Science in Computer Science",
    "Bachelor of Science in Business Information Systems",
    "Bachelor of Science in Digital Marketing",
    "Bachelor of Science in Graphics, Multimedia & Animation",
    "Bachelor of Science in Hardware, Networking and Security Administration",
    "Bachelor of Social Work (Generic)",
    "Bachelor of Social Work in Medical & Psychiatry",
    "Bachelor of Arts in Social Work and Counseling",
    "Bachelor of Business Administration",
    "Bachelor of Public Administration",
    "Bachelor of Commerce in Accounts and Finance",
    "Bachelor of Education (Early Childhood Education)",
    "Bachelor of Education in Primary Education",
    "Bachelor of Science in Secondary Education (Mathematics and Biology)",
    "Bachelor of Science in Secondary Education (Biology and Chemistry)",
    "Bachelor of Science in Secondary Education (Physics and Chemistry)",
    "Bachelor of Education with Mathematics and Computer Science",
    "Bachelor of Science in Secondary Education (ICT)",
    "Bachelor of Arts in Secondary Education (History and Geography)",
    "Bachelor of Arts in Secondary Education (Civic Education and Religious Education)",
    "Bachelor of Arts in Secondary Education (English and Civic Education)",
    "Bachelor of Education (Business Studies)",
    "Bachelor of Law"
  ],
  masters: [
    "Master of Science in Computer Science",
    "Master of Social Work in Community Development",
    "Master of Social Work in Project Management, Monitoring & Evaluation",
    "Master of Commerce in Accounts and Finance",
    "Master of Business Administration",
    "Master of Business Administration in Finance and International Business",
    "Master of Business Administration in Human Resource Management",
    "Master of Business Administration in Marketing and Entrepreneurship",
    "Master of Education in Educational Administration and Management",
    "Master of Education (Mathematics Education)",
    "Master of Education (Physics Education)",
    "Master of Education (Chemistry Education)",
    "Master of Education (Biology Education)",
    "Master of Education (Geography Education)",
    "Master of Education (Civic Education)",
    "Master of Education (Primary Education)",
    "Master of Arts in Linguistics"
  ],
  diplomas: [
    "Diploma in Computer Science",
    "Diploma in Social Work",
    "Diploma in Accounts and Finance",
    "Diploma in Business Administration",
    "Diploma in Registered Nursing",
    "Diploma in Clinical Medical Sciences – General",
    "Diploma in Environmental Health Sciences",
    "Diploma in Physiotherapy",
    "Diploma in Food and Nutrition",
    "Diploma in Primary Education",
    "Postgraduate Diploma in Teaching Methodology"
  ],
  phd: [
    "PhD Programme in Computer Science",
    "PhD Programme in Social Work",
    "PhD in Commerce",
    "PhD in Management Studies",
    "PhD in Education"
  ]
};

export default function QuickAdmissionPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    student_name: '',
    student_phone: '',
    student_email: '',
    national_id: '',
    program: '',
    mode_of_study: 'Full-time',
    institution_id: '',
    reference_person: '',
  });
  const [programCategory, setProgramCategory] = useState<'bachelors' | 'masters' | 'diplomas' | 'phd'>('bachelors');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Load institutions
    supabase.from('institutions').select('id, institution_name').eq('status', 'active').then(({ data }) => {
      if (data) setInstitutions(data);
    });
    // Check auth
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login');
      else {
        setUser(user);
        supabase.from('profiles').select('full_name').eq('id', user.id).single()
          .then(({ data }) => {
            if (data?.full_name) setFormData(prev => ({ ...prev, reference_person: data.full_name }));
          });
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admission/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, recruiter_id: user?.id }),
      });
      const data = await res.json();
      if (data.alreadyAdmitted) setResult({ alreadyAdmitted: true, admission: data.admission });
      else if (data.success) setResult({ success: true, admission: data.admission });
      else setResult({ error: data.error });
    } catch (err) {
      setResult({ error: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDocx = (refNo: string) => {
    window.open(`/api/admission/download-docx?ref=${refNo}`, '_blank');
  };

  const sendViaWhatsApp = async (refNo: string) => {
    const phone = prompt('Enter WhatsApp number (with country code):', '+260955201532');
    if (!phone) return;
    const res = await fetch('/api/admission/send-wa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref_no: refNo, phoneNumber: phone }),
    });
    const data = await res.json();
    if (data.waUrl) {
      window.open(data.waUrl, '_blank');
      alert('WhatsApp message opened. Send to the student.');
    } else {
      alert('Failed to send. Try again.');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <Building2 className="w-20 h-20 mx-auto text-blue-600" />
          <h1 className="text-4xl font-bold">DMI-St. Eugene University</h1>
          <p className="text-gray-500">Get Quick Admission Letter (DOCX + QR Code)</p>
        </div>

        {result?.alreadyAdmitted ? (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 text-yellow-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Student Already Admitted</h2>
            </div>
            <div className="space-y-2">
              <p><strong>Reference No:</strong> {result.admission.ref_no}</p>
              <p><strong>Student:</strong> {result.admission.student_name}</p>
              <p><strong>Program:</strong> {result.admission.program}</p>
              <p><strong>Admitted by:</strong> {result.admission.reference_person}</p>
              <p><strong>Payment Status:</strong> {result.admission.payment_status}</p>
            </div>
            <button onClick={() => setResult(null)} className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg">
              Try Another Student
            </button>
          </div>
        ) : result?.success ? (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <CheckCircle className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Admission Letter Generated</h2>
            </div>
            <div className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <p><strong>Reference No:</strong> {result.admission.ref_no}</p>
                  <p><strong>Student:</strong> {result.admission.student_name}</p>
                  <p><strong>Program:</strong> {result.admission.program}</p>
                  <p><strong>Mode of Study:</strong> {result.admission.mode_of_study}</p>
                </div>
                <div className="bg-white p-2 rounded shadow">
                  <QRCodeSVG value={`${window.location.origin}/verify/${result.admission.ref_no}`} size={100} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => downloadDocx(result.admission.ref_no)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> Download DOCX (Unsigned)
              </button>
              <button
                onClick={() => sendViaWhatsApp(result.admission.ref_no)}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Send via WhatsApp
              </button>
            </div>
            <button onClick={() => setResult(null)} className="mt-4 text-blue-600 underline">
              Generate Another Letter
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            {result?.error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{result.error}</div>
            )}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  name="student_name"
                  placeholder="Full Name"
                  value={formData.student_name}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  name="student_phone"
                  placeholder="Phone"
                  value={formData.student_phone}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  name="student_email"
                  placeholder="Email"
                  value={formData.student_email}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">National ID / Passport *</label>
                <input
                  name="national_id"
                  placeholder="National ID"
                  value={formData.national_id}
                  onChange={handleChange}
                  className="w-full border rounded-xl p-3"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Study</label>
              <select
                name="mode_of_study"
                value={formData.mode_of_study}
                onChange={handleChange}
                className="w-full border rounded-xl p-3"
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Online</option>
                <option>Distance Learning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institution *</label>
              <select
                name="institution_id"
                value={formData.institution_id}
                onChange={handleChange}
                className="w-full border rounded-xl p-3"
                required
              >
                <option value="">Select Institution</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.institution_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program Category</label>
              <select
                value={programCategory}
                onChange={(e) => setProgramCategory(e.target.value as any)}
                className="w-full border rounded-xl p-3"
              >
                <option value="bachelors">Bachelor's Programmes</option>
                <option value="masters">Master's Programmes</option>
                <option value="diplomas">Diploma Programmes</option>
                <option value="phd">PhD Programmes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Program *</label>
              <select
                name="program"
                value={formData.program}
                onChange={handleChange}
                className="w-full border rounded-xl p-3"
                required
              >
                <option value="">-- Choose a programme --</option>
                {PROGRAMS[programCategory].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Person (Recruiter)</label>
              <input
                name="reference_person"
                value={formData.reference_person}
                readOnly
                className="w-full border rounded-xl p-3 bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1">Automatically set to your name.</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {submitting ? 'Generating...' : 'Get Admission Letter'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}