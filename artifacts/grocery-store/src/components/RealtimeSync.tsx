import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * CustomerRealtimeSync — mounts a silent SSE connection for the customer storefront.
 * Works for both authenticated and anonymous visitors.
 * - product_updated    → invalidate product list/detail caches
 * - store_status_changed → invalidate store status cache
 * - voucher_added      → invalidate the customer's voucher list (auth-only event)
 * - order_status_changed → invalidate the customer's order list (auth-only event)
 */
export function CustomerRealtimeSync() {
  const queryClient = useQueryClient();
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
  }, [queryClient]);

  return null;
}

/**
 * AdminRealtimeSync — lightweight query-invalidation layer for the admin portal.
 * The admin already has a full SSE connection via NotificationContext for
 * new_order / order_assigned events. This component piggybacks on the same
 * /stream endpoint to invalidate admin query caches on data-change events.
 */
export function AdminRealtimeSync() {
  const queryClient = useQueryClient();
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

      es.addEventListener('order_status_changed', () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      });

      es.addEventListener('store_status_changed', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          queryClient.setQueryData(['/api/store/status'], { open: data.open });
        } catch {
          queryClient.invalidateQueries({ queryKey: ['/api/store/status'] });
        }
        queryClient.invalidateQueries({ queryKey: ['/api/store/settings'] });
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
  }, [queryClient]);

  return null;
}

/**
 * DeliveryRealtimeSync — query-invalidation layer for the delivery portal.
 * The delivery person already has NotificationContext for order_assigned events.
 * This component invalidates their order list when status changes occur.
 */
export function DeliveryRealtimeSync() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (esRef.current) esRef.current.close();

      const es = new EventSource('/api/notifications/stream', { withCredentials: true });
      esRef.current = es;

      es.addEventListener('order_status_changed', () => {
        queryClient.invalidateQueries({ queryKey: ['/api/delivery/orders'] });
      });

      es.addEventListener('order_assigned', () => {
        queryClient.invalidateQueries({ queryKey: ['/api/delivery/orders'] });
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
  }, [queryClient]);

  return null;
}
