'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function PaymentsPage() {
  const [amount, setAmount] = useState('')
  const [payments, setPayments] = useState<any[]>([])

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    const { data } = await supabase.from('payments').select('*')
    setPayments(data || [])
  }

  const addPayment = async () => {
    await supabase.from('payments').insert({
      amount: Number(amount)
    })

    setAmount('')
    loadPayments()
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">💰 Payments</h1>

      <div className="mb-4">
        <input
          className="border p-2 mr-2"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          onClick={addPayment}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add Payment
        </button>
      </div>

      <table className="w-full bg-white rounded-xl shadow">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3">Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3">K{p.amount}</td>
              <td>{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}