import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useOnlineStatus() {
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

    // Initial update
    updateOnlineStatus();

    // Update every 60 seconds
    const interval = setInterval(updateOnlineStatus, 60000);

    // Set offline on page unload
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
}