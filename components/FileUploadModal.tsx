'use client';

import { useState, useCallback } from 'react';
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  extractLeadsFromFile,
  validateAndCleanLeads,
  ExtractedLead,
} from '@/lib/leadExtraction';

interface InstitutionOption {
  id: string;
  institution_name: string;
  institution_code: string;
}

interface FileUploadModalProps {
  onLeadsExtracted: (leads: ExtractedLead[]) => void;
  onClose: () => void;
  isOpen: boolean;
  institutions: InstitutionOption[];
  selectedInstitution: string;
  onInstitutionChange: (institutionId: string) => void;
}

export default function FileUploadModal({
  onLeadsExtracted,
  onClose,
  isOpen,
  institutions,
  selectedInstitution,
  onInstitutionChange,
}: FileUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedLeads, setExtractedLeads] = useState<ExtractedLead[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const supportedFormats = [
    '.xlsx',
    '.xls',
    '.csv',
    '.pdf',
    '.docx',
    '.doc',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.txt',
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setExtractedLeads([]);

    try {
      const leads = await extractLeadsFromFile(file);
      const validatedLeads = validateAndCleanLeads(leads);

      if (validatedLeads.length === 0) {
        setError('No valid leads found in the file. Please check the format.');
        return;
      }

      setFileName(file.name);
      setExtractedLeads(validatedLeads);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process file'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      processFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleImport = () => {
    onLeadsExtracted(extractedLeads);
    handleClose();
  };

  const handleClose = () => {
    setExtractedLeads([]);
    setFileName('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Import Leads from File</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          <p className="font-semibold">Institution assignment</p>
          <p className="mt-1 text-sm text-blue-700/80">
            Assign all imported leads to a single institution, or leave blank to keep institution tags from the file data.
          </p>
          <select
            value={selectedInstitution}
            onChange={(e) => onInstitutionChange(e.target.value)}
            className="mt-3 w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select institution for imported leads</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.institution_name} ({inst.institution_code})
              </option>
            ))}
          </select>
        </div>

        {extractedLeads.length === 0 ? (
          <>
            {/* Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload
                size={48}
                className={`mx-auto mb-4 ${
                  dragActive ? 'text-blue-500' : 'text-gray-400'
                }`}
              />
              <p className="text-lg font-semibold mb-2">
                {loading ? 'Processing file...' : 'Drop file here or click to select'}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supported formats: Excel, CSV, PDF, Word, Images (JPG, PNG), Text
              </p>
              <input
                type="file"
                onChange={handleChange}
                disabled={loading}
                accept={supportedFormats.join(',')}
                className="hidden"
                id="file-input"
              />
              <button
                type="button"
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer font-medium transition"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  '📁 Select File'
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Supported Formats Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-semibold text-blue-900 mb-2">📋 Supported Formats:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Excel: .xlsx, .xls (columns: name, email, phone, country, program)</li>
                <li>• CSV: All columns automatically detected</li>
                <li>• PDF: Text extraction with pattern matching</li>
                <li>• Word: .docx, .doc files</li>
                <li>• Images: .jpg, .png, .gif, .webp (WhatsApp screenshots)</li>
                <li>• Text: .txt files with one lead per line</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            {/* Extracted Leads Preview */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
                <p className="text-green-800">
                  <span className="font-semibold">{extractedLeads.length} leads</span>{' '}
                  extracted from {fileName}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-200 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Phone</th>
                      <th className="px-4 py-2 text-left">Country</th>
                      <th className="px-4 py-2 text-left">Program</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedLeads.slice(0, 10).map((lead, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-100">
                        <td className="px-4 py-2">{lead.name}</td>
                        <td className="px-4 py-2 text-xs">{lead.email}</td>
                        <td className="px-4 py-2">{lead.phone}</td>
                        <td className="px-4 py-2">{lead.country || '-'}</td>
                        <td className="px-4 py-2">{lead.program || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {extractedLeads.length > 10 && (
                <p className="text-sm text-gray-600 mt-2">
                  ...and {extractedLeads.length - 10} more leads
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setExtractedLeads([]);
                  setFileName('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Upload Another File
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Import All Leads
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
