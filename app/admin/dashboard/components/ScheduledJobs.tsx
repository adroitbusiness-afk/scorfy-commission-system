'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Play, Pause, Plus } from 'lucide-react';

export default function ScheduledJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const fetchJobs = async () => { const { data } = await supabase.from('scheduled_jobs').select('*').order('next_run'); setJobs(data || []); };
  useEffect(() => { fetchJobs(); }, []);
  const toggleJob = async (id: string, enabled: boolean) => { await supabase.from('scheduled_jobs').update({ enabled }).eq('id', id); fetchJobs(); };
  const runNow = async (endpoint: string) => { await fetch(endpoint, { method: 'POST' }); alert('Job triggered'); };
  return (<div className="bg-white p-6 rounded shadow"><div className="flex justify-between"><h2 className="text-xl font-bold">Scheduled Jobs</h2><button className="bg-blue-600 text-white px-3 py-1 rounded flex gap-1"><Plus className="w-4 h-4" /> Add Job</button></div><div className="mt-4 space-y-3">{jobs.map(job => (<div key={job.id} className="flex justify-between items-center border p-3 rounded"><div><div className="font-medium">{job.name}</div><div className="text-xs text-gray-500">{job.cron_expression} → {job.endpoint}</div>{job.last_run && <div className="text-xs">Last run: {new Date(job.last_run).toLocaleString()}</div>}</div><div className="flex gap-2"><button onClick={() => runNow(job.endpoint)} className="p-1 hover:bg-gray-100 rounded"><Play className="w-4 h-4" /></button><button onClick={() => toggleJob(job.id, !job.enabled)} className="p-1 hover:bg-gray-100 rounded">{job.enabled ? <Pause className="w-4 h-4 text-green-600" /> : <Play className="w-4 h-4 text-gray-400" />}</button></div></div>))}</div><p className="text-sm text-gray-500 mt-4">Cron jobs are executed via serverless functions. Use this panel to monitor and control automation.</p></div>);
}