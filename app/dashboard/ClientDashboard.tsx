"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import GamifiedCard from "./GamifiedCard";

export default function ClientDashboard() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Clients</h1>
      <div className="grid grid-cols-3 gap-6">
        <GamifiedCard title="Universities" value={12} icon="ðŸŽ“" color="from-indigo-600 to-purple-600" />
        <GamifiedCard title="Corporate Clients" value={8} icon="ðŸ¢" color="from-green-600 to-emerald-600" />
        <GamifiedCard title="Active Contracts" value={15} icon="ðŸ“œ" color="from-orange-600 to-red-600" />
      </div>
      {/* Optional: display live messages if needed */}
      {messages.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold">Live Updates</h3>
          <ul>
            {messages.map((msg, idx) => (
              <li key={idx} className="text-sm text-gray-600">{msg.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
