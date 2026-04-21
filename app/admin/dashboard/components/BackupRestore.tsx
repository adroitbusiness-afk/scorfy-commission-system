'use client';
import { useState } from 'react';
import { Database, Download, Upload } from 'lucide-react';

export default function BackupRestore() {
  const [backingUp, setBackingUp] = useState(false);
  const handleBackup = async () => {
    setBackingUp(true);
    const res = await fetch('/api/admin/backup', { method: 'POST' });
    const { url } = await res.json();
    window.open(url);
    setBackingUp(false);
  };
  return (<div className="bg-white p-6 rounded shadow"><h2 className="text-xl font-bold mb-4">Backup & Restore</h2><div className="space-y-4"><button onClick={handleBackup} disabled={backingUp} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"><Database className="w-4 h-4" /> {backingUp ? 'Creating backup...' : 'Manual Backup'}</button><div className="border-t pt-4"><p className="text-sm text-gray-600">Automatic backups run daily at 02:00 UTC. To restore a backup, contact support or use the Supabase dashboard.</p></div><div className="bg-yellow-50 p-3 rounded"><p className="text-sm">⚠️ Restore is a destructive operation. Always verify backups before restoring.</p></div></div></div>);
}