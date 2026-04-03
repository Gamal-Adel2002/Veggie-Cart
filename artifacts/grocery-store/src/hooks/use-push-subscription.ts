import { useEffect } from 'react';
import { useStore } from '@/store';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Lightweight hook to register a Web Push subscription for the current user.
 * Used by customer-facing chat pages so customers receive push notifications
 * for private messages when they are not actively viewing the thread.
 *
 * Safe to call multiple times — the backend upserts by endpoint.
 */
export function usePushSubscription() {
  const token = useStore(s => s.token);
  const user = useStore(s => s.user);

  useEffect(() => {
    if (!token || !user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        if (cancelled) return;

        if (!('Notification' in window)) return;
        const perm = Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission;
        if (perm !== 'granted' || cancelled) return;

        const vapidRes = await fetch('/api/notifications/vapid-public-key');
        if (!vapidRes.ok || cancelled) return;
        const { publicKey } = await vapidRes.json() as { publicKey: string };
        if (!publicKey || cancelled) return;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        });
        if (cancelled) return;

        const { keys } = sub.toJSON() as { keys: { auth: string; p256dh: string } };
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ endpoint: sub.endpoint, keys }),
        });
      } catch {
        // Silently ignore — push is best-effort
      }
    };

    setup();
    return () => { cancelled = true; };
  }, [token, user?.id]);
}
