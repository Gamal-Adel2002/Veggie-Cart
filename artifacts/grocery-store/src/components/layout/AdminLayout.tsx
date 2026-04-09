import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Package, ShoppingBag, Truck, Grid, LayoutDashboard, LogOut, UserCog, MapPin, Users, ClipboardList, Building2, ShoppingCart, Megaphone, MessageCircle, Tag, Gift, Clock, BadgeDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';
import { useAppLogout } from '@/hooks/use-auth-api';
import { useTranslation } from '@/lib/i18n';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationToast } from '@/components/notifications/NotificationToast';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logoutAction = useStore(s => s.logout);
  const { mutate: logoutApi } = useAppLogout();
  const { t } = useTranslation();
  const { notifications } = useNotifications();

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
    { href: '/admin/products', icon: Package, label: 'Products' },
    { href: '/admin/categories', icon: Grid, label: 'Categories' },
    { href: '/admin/customers', icon: Users, label: t('adminCustomers') },
    { href: '/admin/delivery', icon: Truck, label: 'Delivery Staff' },
    { href: '/admin/delivery-zones', icon: MapPin, label: t('adminDeliveryZones') },
    { href: '/admin/admins', icon: UserCog, label: 'Admins' },
    { href: '/admin/ordered-products', icon: ClipboardList, label: "Order's Products" },
    { href: '/admin/suppliers', icon: Building2, label: 'Suppliers' },
    { href: '/admin/supplier-orders', icon: ShoppingCart, label: 'Purchase Orders' },
    { href: '/admin/public-chat', icon: Megaphone, label: 'Public Chat' },
    { href: '/admin/private-chats', icon: MessageCircle, label: 'Private Chats' },
    { href: '/admin/promo-codes', icon: Tag, label: 'Promo Codes' },
    { href: '/admin/vouchers', icon: Gift, label: 'Vouchers' },
    { href: '/admin/delivery-fee', icon: BadgeDollarSign, label: 'Delivery Fee' },
    { href: '/admin/store-hours', icon: Clock, label: 'Store Hours' },
  ];

  const handleLogout = () => {
    logoutApi();
    logoutAction();
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-muted/30 flex w-full">
      <aside className="w-64 border-e border-border bg-card fixed h-full flex flex-col z-50">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="font-display font-bold text-xl text-primary">Admin Panel</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location === item.href || (item.href !== '/admin' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? 'default' : 'ghost'}
                  className={`w-full justify-start ${active ? 'shadow-md shadow-primary/20' : 'text-muted-foreground'}`}
                >
                  <item.icon className="w-5 h-5 me-3" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="w-5 h-5 me-3" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 ms-64 min-h-screen">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="text-lg font-semibold text-foreground capitalize">
            {location.split('/').pop() || 'Dashboard'}
          </h1>
          <NotificationBell />
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <NotificationToast notifications={notifications} />
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = useStore(s => s.token);

  return (
    <NotificationProvider role="admin" token={token}>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </NotificationProvider>
  );
}
