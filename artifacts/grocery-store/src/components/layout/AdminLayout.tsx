import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Package, ShoppingBag, Truck, Grid, LayoutDashboard, LogOut, UserCog, MapPin, Users, ClipboardList, Building2, ShoppingCart, Megaphone, MessageCircle, Tag, Gift, Clock, BadgeDollarSign, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store';
import { useAppLogout } from '@/hooks/use-auth-api';
import { useAdminTranslation } from '@/lib/portalI18n';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationToast } from '@/components/notifications/NotificationToast';

const ROUTE_TITLE_KEYS: Record<string, string> = {
  '/admin': 'adminNavDashboard',
  '/admin/orders': 'adminNavOrders',
  '/admin/products': 'adminNavProducts',
  '/admin/categories': 'adminNavCategories',
  '/admin/customers': 'adminCustomers',
  '/admin/delivery': 'adminNavDeliveryStaff',
  '/admin/delivery-zones': 'adminDeliveryZones',
  '/admin/admins': 'adminAdminAccounts',
  '/admin/ordered-products': 'adminNavOrderedProducts',
  '/admin/suppliers': 'adminSuppliersTitle',
  '/admin/supplier-orders': 'adminPurchaseOrdersTitle',
  '/admin/public-chat': 'adminNavPublicChat',
  '/admin/private-chats': 'adminNavPrivateChats',
  '/admin/promo-codes': 'adminNavPromosLabel',
  '/admin/vouchers': 'adminNavVouchersLabel',
  '/admin/delivery-fee': 'adminNavDeliveryFeeLabel',
  '/admin/store-hours': 'adminNavStoreHours',
};

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logoutAction = useStore(s => s.logout);
  const { mutate: logoutApi } = useAppLogout();
  const { t, lang, setLang, dir } = useAdminTranslation();
  const { notifications } = useNotifications();

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: t('adminNavDashboard') },
    { href: '/admin/orders', icon: ShoppingBag, label: t('adminNavOrders') },
    { href: '/admin/products', icon: Package, label: t('adminNavProducts') },
    { href: '/admin/categories', icon: Grid, label: t('adminNavCategories') },
    { href: '/admin/customers', icon: Users, label: t('adminCustomers') },
    { href: '/admin/delivery', icon: Truck, label: t('adminNavDeliveryStaff') },
    { href: '/admin/delivery-zones', icon: MapPin, label: t('adminDeliveryZones') },
    { href: '/admin/admins', icon: UserCog, label: t('adminNavAdmins') },
    { href: '/admin/ordered-products', icon: ClipboardList, label: t('adminNavOrderedProducts') },
    { href: '/admin/suppliers', icon: Building2, label: t('adminNavSuppliers') },
    { href: '/admin/supplier-orders', icon: ShoppingCart, label: t('adminNavPurchaseOrders') },
    { href: '/admin/public-chat', icon: Megaphone, label: t('adminNavPublicChat') },
    { href: '/admin/private-chats', icon: MessageCircle, label: t('adminNavPrivateChats') },
    { href: '/admin/promo-codes', icon: Tag, label: t('adminNavPromosLabel') },
    { href: '/admin/vouchers', icon: Gift, label: t('adminNavVouchersLabel') },
    { href: '/admin/delivery-fee', icon: BadgeDollarSign, label: t('adminNavDeliveryFeeLabel') },
    { href: '/admin/store-hours', icon: Clock, label: t('adminNavStoreHours') },
  ];

  const handleLogout = () => {
    logoutApi();
    logoutAction();
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-muted/30 flex w-full" dir={dir}>
      <aside className="w-64 border-e border-border bg-card fixed h-full flex flex-col z-50">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="font-display font-bold text-xl text-primary">{t('adminPanelTitle')}</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location === item.href || (item.href !== '/admin' && location.startsWith(item.href + '/'));
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
            {t('adminLogout')}
          </Button>
        </div>
      </aside>

      <main className="flex-1 ms-64 min-h-screen">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="text-lg font-semibold text-foreground">
            {t(ROUTE_TITLE_KEYS[location] || 'adminNavDashboard')}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
              title={lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'en' ? 'AR' : 'EN'}</span>
            </button>
            <NotificationBell />
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <NotificationToast notifications={notifications} />
    </div>
  );
}

function AdminLayoutWithProviders({ children }: { children: React.ReactNode }) {
  const token = useStore(s => s.token);

  return (
    <NotificationProvider role="admin" token={token}>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </NotificationProvider>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutWithProviders>{children}</AdminLayoutWithProviders>
  );
}
