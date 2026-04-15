'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { QRCodeCanvas } from 'qrcode.react';
import { Loader2, CheckCircle, AlertCircle, Download, Share2 } from 'lucide-react';

interface Program {
  id: string;
  program_code: string;
  program_name: string;
  description: string;
  duration: string;
  tuition_fee: number;
  application_fee: number;
  intake_months: string[];
}

interface Institution {
  id: string;
  institution_name: string;
  institution_code: string;
  logo_url: string;
  institution_programs: Program[];
}

export default function InstitutionLandingClient({ institution }: { institution: Institution }) {
  const router = useRouter();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    previous_qualification: '',
    institution_name: '',
    graduation_year: '',
    additional_info: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgram) {
      setError('Please select a program');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      // Insert application
      const { data, error: insertError } = await supabase
        .from('student_applications')
        .insert({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          address: formData.address,
          previous_qualification: formData.previous_qualification,
          institution_name: formData.institution_name,
          graduation_year: parseInt(formData.graduation_year) || null,
          program_id: selectedProgram.id,
          institution_id: institution.id,
          additional_info: { extra: formData.additional_info },
          application_status: 'submitted',
          submitted_at: new Date().toISOString(),
          tracking_token: crypto.randomUUID(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setApplicationId(data.id);
      setTrackingToken(data.tracking_token);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `application_${trackingToken}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  if (submitted && trackingToken) {
    const trackingUrl = `${window.location.origin}/track/${trackingToken}`;
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
            <p className="text-gray-600 mb-6">Your application to {institution.institution_name} has been received.</p>
            
            <div className="bg-gray-100 rounded-xl p-6 mb-6">
              <h3 className="font-semibold mb-3">Your Tracking QR Code</h3>
              <div className="flex justify-center mb-4">
                <QRCodeCanvas id="qr-code" value={trackingUrl} size={180} level="H" includeMargin />
              </div>
              <button
                onClick={downloadQRCode}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download size={16} /> Download QR Code
              </button>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">Your application tracking link:</p>
              <code className="text-xs break-all">{trackingUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(trackingUrl)}
                className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <Share2 size={14} /> Copy link
              </button>
            </div>

            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header with logo */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-4">
              {institution.logo_url && (
                <img src={institution.logo_url} alt={institution.institution_name} className="h-16 w-16 rounded-full bg-white p-1" />
              )}
              <div>
                <h1 className="text-2xl font-bold">{institution.institution_name}</h1>
                <p className="text-white/80">Application for Admission</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Program Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Program *</label>
              <select
                required
                value={selectedProgram?.id || ''}
                onChange={(e) => {
                  const program = institution.institution_programs.find(p => p.id === e.target.value);
                  setSelectedProgram(program || null);
                }}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a program --</option>
                {institution.institution_programs.map((prog) => (
                  <option key={prog.id} value={prog.id}>
                    {prog.program_name} ({prog.duration}) – K{prog.tuition_fee.toLocaleString()}/year
                  </option>
                ))}
              </select>
            </div>

            {selectedProgram && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold">Program Details</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedProgram.description}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div><strong>Duration:</strong> {selectedProgram.duration}</div>
                  <div><strong>Tuition:</strong> K{selectedProgram.tuition_fee.toLocaleString()}/year</div>
                  <div><strong>Application Fee:</strong> K{selectedProgram.application_fee.toLocaleString()}</div>
                  <div><strong>Intakes:</strong> {selectedProgram.intake_months?.join(', ')}</div>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" name="full_name" placeholder="Full Name *" required value={formData.full_name} onChange={handleInputChange} className="p-3 border rounded-lg" />
                <input type="email" name="email" placeholder="Email Address *" required value={formData.email} onChange={handleInputChange} className="p-3 border rounded-lg" />
                <input type="tel" name="phone" placeholder="Phone Number *" required value={formData.phone} onChange={handleInputChange} className="p-3 border rounded-lg" />
                <input type="date" name="date_of_birth" placeholder="Date of Birth" value={formData.date_of_birth} onChange={handleInputChange} className="p-3 border rounded-lg" />
                <textarea name="address" placeholder="Address" rows={2} value={formData.address} onChange={handleInputChange} className="p-3 border rounded-lg col-span-2" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-4">Academic Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" name="previous_qualification" placeholder="Previous Qualification" value={formData.previous_qualification} onChange={handleInputChange} className="p-3 border rounded-lg" />
                <input type="text" name="institution_name" placeholder="Previous Institution" value={formData.institution_name} onChange={handleInputChange} className="p-3 border rounded-lg" />
                <input type="number" name="graduation_year" placeholder="Year of Graduation" value={formData.graduation_year} onChange={handleInputChange} className="p-3 border rounded-lg" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
              <textarea name="additional_info" rows={3} placeholder="Any additional information you'd like to share?" value={formData.additional_info} onChange={handleInputChange} className="p-3 border rounded-lg w-full" />
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedProgram}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle size={20} />}
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
