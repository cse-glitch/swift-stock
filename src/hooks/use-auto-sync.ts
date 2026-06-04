import { useEffect, useRef } from 'react';
import { dbEvents } from '@/lib/db';
import { pushLocalToSupabase } from '@/lib/sync';

/**
 * useAutoSync hook
 * Listens for local database changes and triggers a debounced sync to Supabase.
 */
export function useAutoSync() {
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = dbEvents.subscribe(() => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          await pushLocalToSupabase();
        } catch (error) {
          console.error('AutoSync: Background push failed:', error);
        }
      }, 2000);
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);
}
