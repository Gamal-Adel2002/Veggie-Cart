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
  });
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
  }, [deliveryToken, setLocation]);

  const { data: orders = [], isLoading } = useQuery<DeliveryOrder[]>({
    queryKey: ['/api/delivery/orders'],
    queryFn: async () => {
      if (!deliveryToken) throw new Error('No token');
      const res = await deliveryFetch('/api/delivery/orders', deliveryToken);
      if (!res.ok) throw new Error('Failed to load');
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

  const getMapLink = (order: DeliveryOrder) => {
    if (order.latitude && order.longitude) {
      return `https://www.google.com/maps?q=${order.latitude},${order.longitude}`;
    }
    if (order.deliveryAddress) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`;
    }
    return null;
  };

  const activeOrders = orders.filter(o => o.status !== 'completed');
  const completedOrders = orders.filter(o => o.status === 'completed');

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

        {activeOrders.length > 0 && (
          <div className="space-y-4 mb-8">
            {activeOrders.map(order => {
              const mapLink = getMapLink(order);
              const isCompleting = completingId === order.id || completeMutation.isPending && completingId === order.id;
              return (
                <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-lg">{t('deliveryOrderId')(order.id)}</p>
                      <p className="text-zinc-400 text-xs">{format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs shrink-0">
                      {order.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-zinc-500 shrink-0">{t('deliveryCustomer')}:</span>
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-primary text-xs flex items-center gap-1 mt-0.5"
                        >
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
                      <div className="bg-zinc-800 rounded-lg px-3 py-2 text-zinc-400 text-xs">
                        {order.notes}
                      </div>
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
                      onClick={() => completeMutation.mutate(order.id)}
                    >
                      {isCompleting
                        ? <><Loader2 className="w-4 h-4 me-2 animate-spin" />{t('deliveryCompleting')}</>
                        : <><CheckCircle2 className="w-4 h-4 me-2" />{t('deliveryCompleteBtn')}</>
                      }
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {completedOrders.length > 0 && (
          <div>
            <h2 className="text-zinc-500 text-sm font-semibold mb-3 uppercase tracking-wide">
              {t('deliveryCompleted')} ({completedOrders.length})
            </h2>
            <div className="space-y-2">
              {completedOrders.map(order => (
                <div key={order.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between opacity-60">
                  <div>
                    <p className="font-medium text-sm">{t('deliveryOrderId')(order.id)}</p>
                    <p className="text-zinc-500 text-xs">{order.customerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-sm">{order.totalPrice} EGP</span>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
