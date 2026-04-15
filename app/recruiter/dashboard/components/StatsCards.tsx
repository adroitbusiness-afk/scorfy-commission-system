'use client';

import { useMemo } from 'react';
import { Users, TrendingUp, Brain, Flame, Award } from 'lucide-react';
import { StatsType, RecruiterType } from '../types';

interface StatsCardsProps {
  stats: StatsType;
  recruiter: RecruiterType | null;
  notifications: number;
}

export default function StatsCards({
  stats,
  recruiter,
  notifications,
}: StatsCardsProps) {
  const conversionRate = useMemo(() => {
    if (stats.totalLeads === 0) return '0';
    return ((stats.converted / stats.totalLeads) * 100).toFixed(0);
  }, [stats.totalLeads, stats.converted]);

  const cards = useMemo(
    () => [
      {
        label: 'Total Leads',
        value: stats.totalLeads,
        icon: Users,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
      },
      {
        label: 'Converted',
        value: stats.converted,
        subValue: `${conversionRate}% rate`,
        icon: TrendingUp,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
      },
      {
        label: 'Avg. AI Score',
        value: stats.avgScore,
        icon: Brain,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
      },
      {
        label: 'High Priority',
        value: stats.highPriorityCount,
        icon: Flame,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
      },
      {
        label: 'Reward Points',
        value: stats.rewardPoints,
        icon: Award,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
      },
    ],
    [stats, conversionRate]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`${card.bgColor} border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
              {card.subValue && (
                <p className="text-xs text-gray-500 mt-1">{card.subValue}</p>
              )}
            </div>
            <card.icon className={`w-8 h-8 ${card.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
