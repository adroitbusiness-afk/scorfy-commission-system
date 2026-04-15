"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function ChatDashboard() {
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
      <h1 className="text-2xl font-bold mb-6">Team Communications</h1>
      <div className="bg-gray-800 p-6 rounded-xl">
        {messages.length === 0 ? (
          <p className="text-gray-400">No messages yet.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((msg, idx) => (
              <li key={idx} className="text-white">{msg.text}</li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-gray-400">Internal messaging system will appear here</p>
      </div>
    </div>
  );
}