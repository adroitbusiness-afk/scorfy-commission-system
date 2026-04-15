'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

interface ChartPoint {
  intake: string;
  commission: number;
}

export default function Chart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-bold mb-4">Commission by Intake</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="intake" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="commission" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
