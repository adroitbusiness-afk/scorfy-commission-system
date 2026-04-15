'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { generatePDF } from '@/lib/reportGenerator'

export default function ClaimsPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    loadClaim()
  }, [])

  const loadClaim = async () => {
    const { data } = await supabase
      .from('dashboard_summary')
      .select('*')
      .single()

    setData(data)
  }

  const generateClaim = async () => {
    await supabase.rpc('generate_claim', {
      period: 'Manual Claim'
    })

    alert('Claim recorded')
  }

  if (!data) return <p>Loading...</p>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">📄 Claims</h1>

      <button
        onClick={generateClaim}
        className="bg-green-600 text-white px-4 py-2 rounded mb-4"
      >
        Generate Claim Record
      </button>
      <button
        onClick={() => generatePDF(data)}
        className="bg-black text-white px-4 py-2 rounded ml-2"
      >
        Download PDF
      </button>

      <div className="bg-white p-6 rounded-xl shadow">
        <p>Total Students: {data.total_students}</p>
        <p>Total Commission: K{data.total_commission}</p>
        <p>Total Paid: K{data.total_paid}</p>
        <p className="text-red-600 font-bold">
          Outstanding: K{data.outstanding}
        </p>
      </div>
    </div>
  )
}
