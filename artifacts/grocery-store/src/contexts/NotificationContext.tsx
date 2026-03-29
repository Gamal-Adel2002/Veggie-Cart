import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '@/store';
import { Bell, VolumeX, X } from 'lucide-react';

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
  permissionState: NotificationPermission | 'unsupported';
  soundMuted: boolean;
  unmuteSound: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  clear: () => {},
  permissionState: 'default',
  soundMuted: false,
  unmuteSound: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

const MAX_STORED = 50;

function storageKey(role: string): string {
  return `freshveg-notifications-${role}`;
}

function loadStored(role: string): NotificationItem[] {
  try {
    const raw = localStorage.getItem(storageKey(role));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStored(items: NotificationItem[], role: string) {
  try {
    localStorage.setItem(storageKey(role), JSON.stringify(items.slice(0, MAX_STORED)));
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

const audioCtxRef = { current: null as AudioContext | null };
let audioBlocked = false;

function tryPlayChime() {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      audioBlocked = true;
      ctx.resume().catch(() => {});
      return;
    }
    audioBlocked = false;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  } catch {}
}

interface NotificationProviderProps {
  children: React.ReactNode;
  role: 'admin' | 'delivery';
  token: string | null;
  onNotification?: (item: NotificationItem) => void;
}

function getLocalizedText(
  eventType: 'new_order' | 'order_assigned',
  data: Record<string, unknown>,
  lang: string
): { title: string; body: string } {
  if (eventType === 'new_order') {
    const orderId = data.orderId as number;
    const customerName = data.customerName as string;
    const price = Number(data.totalPrice).toFixed(2);
    if (lang === 'ar') {
      return {
        title: 'طلب جديد',
        body: `طلب #${orderId} من ${customerName} — ${price} ج.م`,
      };
    }
    return {
      title: 'New Order',
      body: `Order #${orderId} from ${customerName} — EGP ${price}`,
    };
  } else {
    const orderId = data.orderId as number;
    const address = (data.deliveryAddress || data.customerName) as string;
    if (lang === 'ar') {
      return {
        title: 'توصيل جديد',
        body: `طلب #${orderId} · ${address}`,
      };
    }
    return {
      title: 'New Delivery Assignment',
      body: `Order #${orderId} · ${address}`,
    };
  }
}

export function NotificationProvider({ children, role, token, onNotification }: NotificationProviderProps) {
  const lang = useStore(s => s.lang);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadStored(role));
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [soundMuted, setSoundMuted] = useState(false);
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasInteracted = useRef(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const unmuteSound = useCallback(() => {
    setSoundMuted(false);
    setShowUnmutePrompt(false);
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().then(() => {
        audioBlocked = false;
      }).catch(() => {});
    }
  }, []);

  const addNotification = useCallback((item: NotificationItem) => {
    setNotifications(prev => {
      const updated = [item, ...prev].slice(0, MAX_STORED);
      saveStored(updated, role);
      return updated;
    });
    if (!soundMuted) {
      tryPlayChime();
      if (audioBlocked && hasInteracted.current) {
        setShowUnmutePrompt(true);
      }
    }
    onNotification?.(item);
  }, [onNotification, soundMuted, role]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveStored(updated, role);
      return updated;
    });
  }, [role]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveStored(updated, role);
      return updated;
    });
  }, [role]);

  const clear = useCallback(() => {
    setNotifications([]);
    saveStored([], role);
  }, [role]);

  useEffect(() => {
    const handler = () => { hasInteracted.current = true; };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }
    setPermissionState(Notification.permission);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => setSwRegistration(reg))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token || !swRegistration) return;

    const setupPush = async () => {
      try {
        if (!('Notification' in window)) return;
        const permResult = await Notification.requestPermission();
        setPermissionState(permResult);
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

  useEffect(() => {
    if (!token) return;

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Authentication via httpOnly cookies (token / delivery_token) sent automatically
      // by withCredentials: true — no bearer token in query string
      const es = new EventSource("/api/notifications/stream", { withCredentials: true });
      eventSourceRef.current = es;

      const handleEvent = (eventType: 'new_order' | 'order_assigned') => (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const { title, body } = getLocalizedText(eventType, data, lang);

          addNotification({
            id: `${eventType}-${data.orderId}-${Date.now()}`,
            type: eventType,
            title,
            body,
            url: data.url || (eventType === 'new_order' ? '/admin/orders' : '/delivery/dashboard'),
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
  }, [token, addNotification, lang]);

  const permDeniedBannerText = lang === 'ar'
    ? 'فعّل الإشعارات للحصول على تنبيهات بالطلبات الجديدة.'
    : 'Enable notifications to get alerts for new orders.';
  const permDeniedBtnText = lang === 'ar' ? 'تفعيل' : 'Enable';
  const unmuteText = lang === 'ar'
    ? 'الصوت محظور بواسطة المتصفح. انقر للتشغيل.'
    : 'Sound blocked by browser. Click to unmute.';

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, clear, permissionState, soundMuted, unmuteSound }}>
      {children}

      {permissionState === 'denied' && (
        <div
          className="fixed bottom-4 start-4 end-4 md:start-auto md:end-4 md:w-80 z-[200] bg-amber-900/90 border border-amber-600 text-amber-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          <Bell className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm flex-1">{permDeniedBannerText}</p>
          <button
            title={lang === 'ar' ? 'انقر على أيقونة القفل في شريط العنوان ثم السماح بالإشعارات' : 'Click the lock icon in the address bar and allow notifications'}
            onClick={() => alert(lang === 'ar'
              ? 'لإعادة التفعيل: انقر على أيقونة القفل (🔒) في شريط العنوان ← الأذونات ← السماح بالإشعارات، ثم أعِد تحميل الصفحة.'
              : 'To re-enable: click the lock icon (🔒) in the address bar → Permissions → Allow Notifications, then reload the page.'
            )}
            className="text-xs font-semibold underline flex-shrink-0"
          >
            {permDeniedBtnText}
          </button>
        </div>
      )}

      {showUnmutePrompt && (
        <div
          className="fixed bottom-4 start-4 end-4 md:start-auto md:end-4 md:w-80 z-[200] bg-zinc-800 border border-zinc-600 text-zinc-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg cursor-pointer"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          onClick={unmuteSound}
        >
          <VolumeX className="w-5 h-5 flex-shrink-0 text-zinc-400" />
          <p className="text-sm flex-1">{unmuteText}</p>
          <button
            onClick={(e) => { e.stopPropagation(); setShowUnmutePrompt(false); }}
            className="text-zinc-400 hover:text-white flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
