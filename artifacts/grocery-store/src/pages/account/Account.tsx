import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useAppOrders } from '@/hooks/use-auth-api';
import { MapPin, User as UserIcon, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';

const statusColors: Record<string, string> = {
  waiting: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  accepted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  preparing: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  with_delivery: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function Account() {
  const { t, lang } = useTranslation();
  const user = useStore(s => s.user);
  const { data: orders, isLoading } = useAppOrders();

  if (!user) return <div className="p-8">{t('pleaseLogin')}</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col md:flex-row gap-8">

        {/* Profile Card */}
        <aside className="w-full md:w-80 shrink-0 space-y-6">
          <div className="bg-card border border-border/50 rounded-3xl p-6 text-center shadow-sm">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {user.profileImage ? (
                <img src={user.profileImage} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <UserIcon className="w-10 h-10 text-primary" />
              )}
            </div>
            <h2 className="text-2xl font-bold font-display">{user.name}</h2>
            <p className="text-muted-foreground">{user.phone}</p>

            {(user.latitude && user.longitude) && (
              <div className="mt-6 pt-6 border-t border-border/50 text-left">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-primary" /> {t('savedLocation')}
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl">{user.latitude.toFixed(4)}, {user.longitude.toFixed(4)}</p>
                {user.address && <p className="text-sm mt-2">{user.address}</p>}
              </div>
            )}
          </div>
        </aside>

        {/* Order History */}
        <div className="flex-1">
          <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> {t('orderHistory')}
          </h2>

          {isLoading ? (
            <p>{t('loadingOrders')}</p>
          ) : !orders || orders.length === 0 ? (
            <div className="bg-card border border-border/50 rounded-3xl p-12 text-center text-muted-foreground">
              {t('noOrdersYet')}
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/50">
                    <div>
                      <p className="font-bold text-lg">{t('order')} #{order.id}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(order.createdAt), 'MMM dd, yyyy - hh:mm a')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-bold text-lg">{order.totalPrice.toFixed(2)} EGP</p>
                      <Badge variant="outline" className={`px-3 py-1 text-sm border ${statusColors[order.status]}`}>
                        {t(`status.${order.status}`)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.items.map(item => `${item.quantity}x ${lang === 'ar' ? item.productNameAr : item.productName}`).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
