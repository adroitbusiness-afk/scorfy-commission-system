import { supabase } from './supabase/client';
import { offlineQueue } from './offlineQueue'; // import your existing OfflineQueue instance

export async function syncOfflineData() {
  const events = await offlineQueue.getEvents();
  for (const event of events) {
    try {
      if (event.type === 'click') {
        await supabase.from('recruiter_referral_clicks').insert(event.data);
      } else if (event.type === 'share') {
        await supabase.from('recruiter_referral_clicks').insert(event.data);
      }
    } catch (err) {
      console.error('Sync error', err);
    }
  }
  await offlineQueue.clearEvents();
}

// Call this when online
window.addEventListener('online', syncOfflineData);