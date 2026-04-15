'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function ReconciliationDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/reconcile', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      setResults(data.results || []);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const approveItem = async (itemId: string, leadId: string, amount: number) => {
    setProcessingIds(prev => new Set(prev).add(itemId));
    try {
      const res = await fetch('/api/reconcile/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, leadId, amount })
      });
      if (!res.ok) throw new Error();
      // Update local state
      setResults(prev => prev.map(r => r.id === itemId ? { ...r, status: 'approved' } : r));
      // Notify finance dashboard to refresh
      window.dispatchEvent(new CustomEvent('reconciliation-updated'));
    } catch (err) {
      console.error(err);
      alert('Approval failed');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const rejectItem = async (itemId: string) => {
    const notes = prompt('Reason for rejection:');
    if (!notes) return;
    setProcessingIds(prev => new Set(prev).add(itemId));
    try {
      const res = await fetch('/api/reconcile/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, notes })
      });
      if (!res.ok) throw new Error();
      setResults(prev => prev.map(r => r.id === itemId ? { ...r, status: 'rejected', notes } : r));
    } catch (err) {
      console.error(err);
      alert('Rejection failed');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const summary = {
    total: results.length,
    matched: results.filter(r => r.status === 'matched' || r.status === 'approved').length,
    amount: results.reduce((sum, r) => sum + (r.amount || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <h2 className="text-xl font-semibold mb-4">Reconcile with University Data</h2>
        <p className="text-gray-400 mb-4">Upload Excel, PDF, or DOCX file containing student payment records.</p>
        <div className="flex gap-4">
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white"
          />
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {loading ? 'Processing...' : 'Reconcile'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Results</h3>
            <div className="text-sm text-gray-400">
              Total: {summary.total} | Matched: {summary.matched} | Total Amount: K{summary.amount.toFixed(2)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">Status</th>
                  <th className="text-left">Name</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Amount</th>
                  <th className="text-left">Message</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id || Math.random()} className="border-b border-gray-800">
                    <td className="py-2">
                      {r.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {r.status === 'rejected' && <XCircle className="w-5 h-5 text-red-400" />}
                      {r.status === 'pending' && <AlertCircle className="w-5 h-5 text-yellow-400" />}
                      {r.status === 'missing' && <XCircle className="w-5 h-5 text-gray-400" />}
                    </td>
                    <td>{r.data?.name || '-'}</td>
                    <td>{r.data?.email || '-'}</td>
                    <td>K{r.amount}</td>
                    <td className="text-sm text-gray-400">{r.message}</td>
                    <td>
                      {r.status === 'pending' && r.lead_id && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveItem(r.id, r.lead_id, r.amount)}
                            disabled={processingIds.has(r.id)}
                            className="px-2 py-1 bg-green-600 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectItem(r.id)}
                            disabled={processingIds.has(r.id)}
                            className="px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {r.status === 'missing' && (
                        <span className="text-xs text-gray-500">Cannot match</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}