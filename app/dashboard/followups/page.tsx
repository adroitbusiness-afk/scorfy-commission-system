'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function FollowUps() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data } = await supabase.from('due_followups').select('*')
    setData(data || [])
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">⏰ Follow Ups</h1>

      {data.map((f) => (
        <div key={f.id} className="bg-white p-3 shadow mb-2">
          Lead ID: {f.lead_id} <br />
          Due: {new Date(f.followup_date).toLocaleDateString()}
        </div>
      ))}
    </div>
  )
}