import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store';

export interface NotificationItem {
  id: string;
  type: 'new_order' | 'order_assigned';
  title: string;
  body: string;
  url?: string;
  timestamp: number;
  read: boolean;
  orderId?: number;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  clear: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

const STORAGE_KEY = 'freshveg-notifications';
const MAX_STORED = 50;

function loadStored(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStored(items: NotificationItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_STORED)));
  } catch {}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const chimeAudioContext = { current: null as AudioContext | null };

function playChime() {
  try {
    if (!chimeAudioContext.current) {
      chimeAudioContext.current = new AudioContext();
    }
    const ctx = chimeAudioContext.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];

    freqs.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + i * 0.12);

      gainNode.gain.setValueAtTime(0.3, now + i * 0.12);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);

      oscillator.start(now + i * 0.12);
      oscillator.stop(now + i * 0.12 + 0.4);
    });
  } catch {}
}

interface NotificationProviderProps {
  children: React.ReactNode;
  role: 'admin' | 'delivery';
  token: string | null;
  onNotification?: (item: NotificationItem) => void;
}

export function NotificationProvider({ children, role, token, onNotification }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(loadStored);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasInteracted = useRef(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((item: NotificationItem) => {
    setNotifications(prev => {
      const updated = [item, ...prev].slice(0, MAX_STORED);
      saveStored(updated);
      return updated;
    });
    playChime();
    onNotification?.(item);
  }, [onNotification]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveStored(updated);
      return updated;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveStored(updated);
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
    saveStored([]);
  }, []);

  // Track user interaction so chime can play
  useEffect(() => {
    const handler = () => { hasInteracted.current = true; };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => setSwRegistration(reg))
      .catch(() => {});
  }, []);

  // Request push permission + subscribe after SW is ready
  useEffect(() => {
    if (!token || !swRegistration) return;

    const setupPush = async () => {
      try {
        const permResult = await Notification.requestPermission();
        if (permResult !== 'granted') return;

        const vapidRes = await fetch('/api/notifications/vapid-public-key');
        if (!vapidRes.ok) return;
        const { publicKey } = await vapidRes.json();
        if (!publicKey) return;

        const appServerKey = urlBase64ToUint8Array(publicKey);
        const sub = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey as unknown as BufferSource,
        });

        const { keys } = sub.toJSON() as { keys: { auth: string; p256dh: string } };
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys,
          }),
        });
      } catch {}
    };

    setupPush();
  }, [token, swRegistration]);

  // Open SSE stream
  useEffect(() => {
    if (!token) return;

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const authParam = encodeURIComponent(token);
      const url = `/api/notifications/stream?auth=${authParam}`;

      const es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      const handleEvent = (eventType: 'new_order' | 'order_assigned') => (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          let title = '';
          let body = '';

          if (eventType === 'new_order') {
            title = 'New Order';
            body = `Order #${data.orderId} from ${data.customerName} — EGP ${Number(data.totalPrice).toFixed(2)}`;
          } else {
            title = 'New Delivery Assignment';
            body = `Order #${data.orderId} · ${data.deliveryAddress || data.customerName}`;
          }

          addNotification({
            id: `${eventType}-${data.orderId}-${Date.now()}`,
            type: eventType,
            title,
            body,
            url: eventType === 'new_order' ? '/admin/orders' : '/delivery',
            timestamp: Date.now(),
            read: false,
            orderId: data.orderId,
          });
        } catch {}
      };

      es.addEventListener('new_order', handleEvent('new_order'));
      es.addEventListener('order_assigned', handleEvent('order_assigned'));

      es.onerror = () => {
        es.close();
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [token, addNotification]);

  // Auth token for SSE — handle token-in-URL pattern via query param
  // The SSE stream endpoint reads the 'auth' query param as fallback
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, clear }}>
      {children}
    </NotificationContext.Provider>
  );
}
