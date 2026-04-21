'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Save, Trash2 } from 'lucide-react';

export default function RoleManager() {
  const [roles, setRoles] = useState<any[]>([]);
  useEffect(() => { fetchRoles(); }, []);
  const fetchRoles = async () => { const { data } = await supabase.from('roles').select('*'); setRoles(data || []); };
  const addRole = async () => { const name = prompt('Role name:'); if (name) { await supabase.from('roles').insert({ name, permissions: {} }); fetchRoles(); } };
  const updatePermissions = async (id: string, permissions: any) => { await supabase.from('roles').update({ permissions }).eq('id', id); fetchRoles(); };
  return (<div className="bg-white p-6 rounded shadow"><div className="flex justify-between"><h2 className="text-xl font-bold">Role Manager</h2><button onClick={addRole} className="bg-green-600 text-white px-3 py-1 rounded flex gap-1"><Plus className="w-4 h-4" /> Add Role</button></div><div className="mt-4 space-y-4">{roles.map(role => (<div key={role.id} className="border p-3 rounded"><div className="font-semibold">{role.name}</div><div className="text-sm text-gray-500 mt-1">Permissions: {JSON.stringify(role.permissions)}</div><button onClick={() => updatePermissions(role.id, { read: true, write: false })} className="mt-2 text-blue-600 text-sm">Edit Permissions</button></div>))}</div></div>);
}