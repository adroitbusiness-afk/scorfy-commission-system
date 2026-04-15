'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  duration: string;
  feePerYear: number;
  description: string;
}

const programs: Program[] = [
  {
    id: 'nursing-bs',
    name: 'Bachelor of Science in Nursing',
    duration: '4 years',
    feePerYear: 18000,
    description: 'Comprehensive nursing education preparing students for professional nursing practice. Includes clinical rotations, theoretical knowledge, and practical skills development.'
  },
  {
    id: 'business-bba',
    name: 'Bachelor of Business Administration',
    duration: '4 years',
    feePerYear: 16000,
    description: 'Business education covering management, finance, marketing, and entrepreneurship. Prepares students for leadership roles in various business sectors.'
  },
  {
    id: 'it-bs',
    name: 'Bachelor of Information Technology',
    duration: '4 years',
    feePerYear: 17000,
    description: 'IT education focusing on software development, systems analysis, cybersecurity, and digital technologies. Includes hands-on programming and project work.'
  },
  {
    id: 'education-bachelor',
    name: 'Bachelor of Education',
    duration: '4 years',
    feePerYear: 15000,
    description: 'Teacher training program combining educational theory with subject specialization. Prepares graduates for teaching careers in secondary schools.'
  },
  {
    id: 'nursing-diploma',
    name: 'Diploma in Nursing',
    duration: '3 years',
    feePerYear: 12000,
    description: 'Practical nursing diploma program focusing on clinical skills and patient care. Prepares students for registered nursing positions.'
  }
];

export default function DMIApplicationForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    program: '',
    previousEducation: '',
    englishProficiency: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const [documents, setDocuments] = useState({
    idCopy: null as File | null,
    certificates: null as File | null,
    photo: null as File | null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectedProgram = programs.find(p => p.id === formData.program);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setDocuments(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const uploadFile = async (file: File, path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(path, file);
      if (error) {
        if (error.message.includes('not found')) {
          throw new Error('Storage not configured. Please contact support.');
        }
        throw error;
      }
      return data.path;
    } catch (err: any) {
      console.error('File upload error:', err);
      throw new Error(`Failed to upload file: ${err.message}`);
    }
  };

  // Check storage availability before submitting
  const checkStorageAvailable = async () => {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        console.warn('Storage check warning:', error);
        return false;
      }
      const hasBucket = data?.some(b => b.name === 'documents');
      if (!hasBucket) {
        console.warn('Documents bucket not found');
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Storage availability check failed:', err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check storage availability first
      const storageAvailable = await checkStorageAvailable();
      if (!storageAvailable) {
        // Allow submission without documents as fallback
        setError('⚠️ File storage is temporarily unavailable. You can still submit without documents.');
        setLoading(false);
        // Optionally allow user to continue without uploads
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Upload documents
      const documentUrls: { [key: string]: string } = {};
      if (documents.idCopy) {
        documentUrls.idCopy = await uploadFile(documents.idCopy, `applications/${user.id}/id_copy_${Date.now()}.pdf`);
      }
      if (documents.certificates) {
        documentUrls.certificates = await uploadFile(documents.certificates, `applications/${user.id}/certificates_${Date.now()}.pdf`);
      }
      if (documents.photo) {
        documentUrls.photo = await uploadFile(documents.photo, `applications/${user.id}/photo_${Date.now()}.jpg`);
      }

      // Create application
      const { error: appError } = await supabase
        .from('applications')
        .insert({
          student_id: user.id,
          institution_id: 'dmi-steugene', // We'll need to create this institution
          program: formData.program,
          status: 'pending',
          application_data: {
            ...formData,
            documents: documentUrls
          },
          submitted_at: new Date().toISOString(),
        });

      if (appError) throw appError;

      setSubmitted(true);
    } catch (err: any) {
      console.error('Application submission error:', err);
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your application to DMI St Eugene University has been submitted successfully.
            You will receive an email confirmation and updates on your application status.
          </p>
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            View My Applications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="text-center">
            <div className="h-16 w-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">DMI</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Apply to DMI St Eugene University</h1>
            <p className="text-gray-600 mt-2">Start your journey towards academic excellence</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Program Selection */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Program Selection</h2>
            <div className="space-y-4">
              {programs.map((program) => (
                <div key={program.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <input
                      type="radio"
                      name="program"
                      value={program.id}
                      checked={formData.program === program.id}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{program.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{program.description}</p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>Duration: {program.duration}</span>
                        <span>Annual Fee: K{program.feePerYear.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Academic Information</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Previous Education *</label>
                <textarea
                  name="previousEducation"
                  value={formData.previousEducation}
                  onChange={handleInputChange}
                  required
                  placeholder="List your previous educational qualifications, grades, and institutions attended"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">English Proficiency</label>
                <select
                  name="englishProficiency"
                  value={formData.englishProficiency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Level</option>
                  <option value="native">Native Speaker</option>
                  <option value="fluent">Fluent</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="basic">Basic</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Emergency Contact</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name *</label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone *</label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Document Upload</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Copy (PDF) *</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    name="idCopy"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required
                    className="flex-1"
                  />
                  {documents.idCopy && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Certificates (PDF) *</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    name="certificates"
                    accept=".pdf"
                    onChange={handleFileChange}
                    required
                    className="flex-1"
                  />
                  {documents.certificates && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passport Photo (JPG/PNG) *</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    name="photo"
                    accept=".jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    required
                    className="flex-1"
                  />
                  {documents.photo && <CheckCircle className="w-5 h-5 text-green-500" />}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ready to Apply?</h3>
                <p className="text-gray-600 mt-1">
                  {selectedProgram ? `Applying for ${selectedProgram.name}` : 'Please select a program'}
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || !selectedProgram}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}