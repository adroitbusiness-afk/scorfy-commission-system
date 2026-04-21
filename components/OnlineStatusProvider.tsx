'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function OnlineStatusProvider() {
  useEffect(() => {
    const updateOnlineStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString(), is_online: true })
          .eq('id', user.id);
      }
    };
    updateOnlineStatus();
    const interval = setInterval(updateOnlineStatus, 60000);
    const handleBeforeUnload = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ is_online: false })
          .eq('id', user.id);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  return null;
}