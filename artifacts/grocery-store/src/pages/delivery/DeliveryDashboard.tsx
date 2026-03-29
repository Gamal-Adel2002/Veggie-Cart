import React, { useState } from 'react';
import { useStore } from '@/store';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Truck, LogOut, MapPin, Package, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { format } from 'date-fns';

interface OrderItem {
  id: number;
  productName: string;
  productNameAr: string;
  quantity: number;
  unit: string;
  price: number;
  subtotal: number;
}

interface DeliveryOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  totalPrice: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

function deliveryFetch(path: string, token: string, options?: RequestInit) {
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
    credentials: 'include',
  });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface OrderGroup {
  label: string;
  orders: DeliveryOrder[];
}

function groupOrdersByProximity(orders: DeliveryOrder[], thresholdKm = 2): OrderGroup[] {
  const geoOrders = orders.filter(o => o.latitude != null && o.longitude != null);
  const noGeoOrders = orders.filter(o => o.latitude == null || o.longitude == null);

  const clusters: DeliveryOrder[][] = [];
  const assigned = new Set<number>();

  for (const order of geoOrders) {
    if (assigned.has(order.id)) continue;
    const cluster = [order];
    assigned.add(order.id);

    for (const other of geoOrders) {
      if (assigned.has(other.id)) continue;
      const dist = haversineKm(
        order.latitude!,
        order.longitude!,
        other.latitude!,
        other.longitude!
      );
      if (dist <= thresholdKm) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }
    clusters.push(cluster);
  }

  const groups: OrderGroup[] = clusters.map((cluster, i) => ({
    label: `Zone ${i + 1}`,
    orders: cluster,
  }));

  if (noGeoOrders.length > 0) {
    groups.push({ label: 'Other', orders: noGeoOrders });
  }

  return groups;
}

function getMapLink(order: DeliveryOrder): string | null {
  if (order.latitude != null && order.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`;
  }
  if (order.deliveryAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;
  }
  return null;
}

function OrderCard({ order, lang, t, onComplete, isCompleting }: {
  order: DeliveryOrder;
  lang: string;
  t: (key: string) => any;
  onComplete: (id: number) => void;
  isCompleting: boolean;
}) {
  const mapLink = getMapLink(order);
  const isActive = order.status !== 'completed';

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4 ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-lg">{t('deliveryOrderId')(order.id)}</p>
          <p className="text-zinc-400 text-xs">{format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}</p>
        </div>
        <Badge className={`text-xs shrink-0 ${isActive ? 'bg-primary/20 text-primary border-primary/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
          {order.status}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <span className="text-zinc-500 shrink-0">{t('deliveryCustomer')}:</span>
          <div>
            <p className="font-medium">{order.customerName}</p>
            <a href={`tel:${order.customerPhone}`} className="text-primary text-xs flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" />
              {order.customerPhone}
            </a>
          </div>
        </div>

        {order.deliveryAddress && (
          <div className="flex gap-2">
            <span className="text-zinc-500 shrink-0">{t('deliveryAddress')}:</span>
            <span className="text-zinc-300">{order.deliveryAddress}</span>
          </div>
        )}

        {order.notes && (
          <div className="bg-zinc-800 rounded-lg px-3 py-2 text-zinc-400 text-xs">{order.notes}</div>
        )}
      </div>

      <div className="border-t border-zinc-800 pt-3">
        <p className="text-zinc-500 text-xs mb-2">{t('deliveryItems')}:</p>
        <ul className="space-y-1">
          {order.items.map(item => (
            <li key={item.id} className="flex justify-between text-sm">
              <span className="text-zinc-300">
                {lang === 'ar' && item.productNameAr ? item.productNameAr : item.productName}
                {' × '}{item.quantity} {item.unit}
              </span>
              <span className="text-zinc-400">{item.subtotal} EGP</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-zinc-800">
          <span>{t('deliveryTotal')}</span>
          <span className="text-primary">{order.totalPrice} EGP</span>
        </div>
      </div>

      {isActive && (
        <div className="flex gap-2 pt-1">
          {mapLink && (
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" size="sm" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <MapPin className="w-4 h-4 me-2" />
                {t('deliveryOpenMap')}
              </Button>
            </a>
          )}
          <Button
            size="sm"
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={isCompleting}
            onClick={() => onComplete(order.id)}
          >
            {isCompleting
              ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t('deliveryCompleting')}</>
              : <><CheckCircle2 className="w-4 h-4 me-2" />{t('deliveryCompleteBtn')}</>
            }
          </Button>
        </div>
      )}

      {!isActive && (
        <div className="flex items-center gap-2 text-green-400 text-sm pt-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('deliveryCompleted')}</span>
        </div>
      )}
    </div>
  );
}

export default function DeliveryDashboard() {
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const deliveryToken = useStore(s => s.deliveryToken);
  const deliveryPerson = useStore(s => s.deliveryPerson);
  const logoutDelivery = useStore(s => s.logoutDelivery);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [completingId, setCompletingId] = useState<number | null>(null);

  React.useEffect(() => {
    if (!deliveryToken) setLocation('/delivery/login');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryToken]);

  const { data: orders = [], isLoading } = useQuery<DeliveryOrder[]>({
    queryKey: ['/api/delivery/orders'],
    queryFn: async () => {
      if (!deliveryToken) throw new Error('No token');
      const res = await deliveryFetch('/api/delivery/orders', deliveryToken);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logoutDelivery();
          setLocation('/delivery/login');
          throw new Error('Session expired');
        }
        throw new Error('Failed to load');
      }
      return res.json();
    },
    enabled: !!deliveryToken,
    refetchInterval: 30000,
  });

  const completeMutation = useMutation({
    mutationFn: async (orderId: number) => {
      if (!deliveryToken) throw new Error('No token');
      setCompletingId(orderId);
      const res = await deliveryFetch(`/api/delivery/orders/${orderId}/complete`, deliveryToken, {
        method: 'PUT',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: (_data, orderId) => {
      toast({ title: t('deliveryCompleted'), description: t('deliveryCompletedDesc')(orderId) });
      queryClient.invalidateQueries({ queryKey: ['/api/delivery/orders'] });
    },
    onError: () => {
      toast({ title: t('deliveryCompleteFail'), variant: 'destructive' });
    },
    onSettled: () => setCompletingId(null),
  });

  const handleLogout = () => {
    logoutDelivery();
    setLocation('/delivery/login');
  };

  const activeOrders = orders.filter(o => o.status !== 'completed');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const groups = groupOrdersByProximity(activeOrders);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">{t('deliveryPortal')}</p>
            <p className="font-semibold text-sm">{deliveryPerson ? t('deliveryWelcome')(deliveryPerson.name) : ''}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 hover:text-white">
          <LogOut className="w-4 h-4 me-2" />
          {t('deliveryLogout')}
        </Button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6">{t('deliveryDashboardTitle')}</h1>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin me-2" />
            {t('deliveryLoading')}
          </div>
        )}

        {!isLoading && activeOrders.length === 0 && completedOrders.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{t('deliveryNoOrders')}</p>
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-8 mb-8">
            {groups.map((group) => (
              <div key={group.label}>
                {groups.length > 1 && (
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">{group.label}</h2>
                    <div className="flex-1 h-px bg-zinc-800" />
                    <span className="text-xs text-zinc-500">{group.orders.length} order{group.orders.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="space-y-4">
                  {group.orders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      lang={lang}
                      t={t}
                      onComplete={(id) => completeMutation.mutate(id)}
                      isCompleting={completingId === order.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {completedOrders.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                {t('deliveryCompleted')} ({completedOrders.length})
              </h2>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="space-y-2">
              {completedOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  lang={lang}
                  t={t}
                  onComplete={(id) => completeMutation.mutate(id)}
                  isCompleting={false}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
