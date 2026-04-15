'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function RecruitersPage() {
  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data } = await supabase
      .from('recruiter_summary')
      .select('*')

    setData(data || [])
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">👥 Recruiter Performance</h1>

      <div className="grid grid-cols-3 gap-6">
        {data.map((r) => (
          <div key={r.id} className="bg-white p-5 rounded-xl shadow">
            <h2 className="font-bold text-lg">{r.name}</h2>
            <p className="text-gray-600">Students: {r.students}</p>
            <p className="text-green-600 font-semibold">
              Commission: K{r.total_commission}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}