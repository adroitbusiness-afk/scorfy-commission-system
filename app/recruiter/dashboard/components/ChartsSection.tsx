'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartDataPoint, CountryData, ProgramData } from '../types';

interface ChartsSectionProps {
  monthlyData: ChartDataPoint[];
  countryData: CountryData[];
  programData: ProgramData[];
  chartColors: string[];
}

export default function ChartsSection({
  monthlyData,
  countryData,
  programData,
  chartColors,
}: ChartsSectionProps) {
  const COLORS = useMemo(() => chartColors, [chartColors]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Line Chart - Leads vs Converted */}
      <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
        <h3 className="font-semibold text-sm mb-4">Leads vs Converted (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="leads"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6' }}
              name="Leads"
            />
            <Line
              type="monotone"
              dataKey="converted"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981' }}
              name="Converted"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart - Leads by Country */}
      <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
        <h3 className="font-semibold text-sm mb-4">Leads by Country</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={countryData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              dataKey="value"
              label={({ name, percent }) =>
                `${name}: ${((percent || 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {countryData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} leads`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart - Leads by Program */}
      <div className="bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition">
        <h3 className="font-semibold text-sm mb-4">Leads by Program</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={programData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              dataKey="value"
              label={({ name, percent }) =>
                `${name}: ${((percent || 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {programData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} leads`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
