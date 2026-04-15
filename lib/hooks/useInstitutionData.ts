'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Generic hook for fetching institution data
export function useInstitutionData(institutionId: string, endpoint: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<{ data: any; timestamp: number } | null>(null);

  const fetchData = useCallback(async () => {
    // Return cached data if less than 5 minutes old
    if (cacheRef.current && Date.now() - cacheRef.current.timestamp < 5 * 60 * 1000) {
      setData(cacheRef.current.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${endpoint}/${institutionId}`);
      const result = await res.json();

      if (result.success) {
        setData(result);
        cacheRef.current = {
          data: result,
          timestamp: Date.now(),
        };
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [institutionId, endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    cacheRef.current = null;
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Hook for analytics data
export function useAnalytics(institutionId: string) {
  return useInstitutionData(institutionId, '/api/analytics/institution');
}

// Hook for communications
export function useCommunications(institutionId: string) {
  return useInstitutionData(institutionId, '/api/communications/messages');
}

// Hook for recruiter performance
export function useRecruiterPerformance(institutionId: string) {
  return useInstitutionData(institutionId, '/api/recruiters/performance');
}

// Hook for intakes
export function useIntakes(institutionId: string) {
  return useInstitutionData(institutionId, '/api/intakes/institution');
}

// Hook for notifications
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications/${userId}`);
        const result = await res.json();

        if (result.success) {
          setNotifications(result.notifications);
          setUnreadCount(result.notifications.filter((n: any) => !n.is_read).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30 * 1000);

    return () => clearInterval(interval);
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, isRead: true }),
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  return { notifications, loading, unreadCount, markAsRead };
}