import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '@/store';

/**
 * CustomerRealtimeSync — mounts a silent SSE connection for the customer storefront.
 * Works for both authenticated and anonymous visitors.
 * Admin and delivery portals get their sync via NotificationContext (shared SSE connection).
 *
 * - product_updated      → invalidate product list caches
 * - store_status_changed → update store open/closed state instantly
 * - voucher_added        → invalidate the customer's voucher list (auth-only event)
 * - order_status_changed → invalidate the customer's order list (auth-only event)
 */
export function CustomerRealtimeSync() {
  const queryClient = useQueryClient();
  const token = useStore(s => s.token);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (esRef.current) esRef.current.close();

      const es = new EventSource('/api/notifications/stream', { withCredentials: true });
      esRef.current = es;

      es.addEventListener('product_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      });

      es.addEventListener('store_status_changed', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          queryClient.setQueryData(['/api/store/status'], { open: data.open });
        } catch {
          queryClient.invalidateQueries({ queryKey: ['/api/store/status'] });
        }
      });

      es.addEventListener('voucher_added', () => {
        queryClient.invalidateQueries({ queryKey: ['my-vouchers'] });
      });

      es.addEventListener('order_status_changed', () => {
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      });

      es.onerror = () => {
        es.close();
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      esRef.current?.close();
      esRef.current = null;
    };
  // Re-establish SSE when auth state changes (anonymous → logged-in or vice versa)
  // so the server correctly identifies the client's role and userId for targeted events.
  }, [queryClient, token]);

  return null;
}
