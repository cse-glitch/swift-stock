import { useEffect, useRef } from 'react';
import { dbEvents, db } from '@/lib/db';
import { pushLocalToSupabase, mapSupabaseRowToLocal } from '@/lib/sync';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const tableMap: Record<string, string> = {
  businesses: 'businesses',
  categories: 'categories',
  products: 'products',
  variants: 'variants',
  orders: 'orders',
  users: 'users',
  inventory_log: 'inventoryLog',
  role_permissions: 'rolePermissions',
  warehouses: 'warehouses',
  warehouse_stock: 'warehouseStock',
  stock_transfers: 'stockTransfers',
};

/**
 * useAutoSync hook
 * Listens for local database changes and triggers a debounced sync to Supabase.
 * Subscribes to Supabase Realtime to keep local Dexie DB updated.
 */
export function useAutoSync() {
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Push local changes
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

    // 2. Listen to remote changes
    let channel: RealtimeChannel | null = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          async (payload) => {
            const tableName = payload.table;
            const dbTable = tableMap[tableName];
            if (!dbTable) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const store = (db as any)[dbTable];
            if (!store) return;

            try {
              if (payload.eventType === 'DELETE') {
                if (payload.old && payload.old.id) {
                  await store.delete(payload.old.id);
                }
              } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                if (payload.new) {
                  // Ignore users in generic real-time to avoid overwriting auth states. 
                  if (tableName === 'users') return;
                  
                  const mapped = mapSupabaseRowToLocal(tableName, payload.new);
                  await store.put(mapped);
                }
              }
            } catch (err) {
              console.error(`Realtime sync error for table ${tableName}:`, err);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Sync: Subscribed to Realtime changes');
          }
        });
    }

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);
}
