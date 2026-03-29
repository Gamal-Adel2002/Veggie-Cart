import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppAdminStats, useAppLowStockProducts } from '@/hooks/use-auth-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, Users, ShoppingBag, AlertTriangle, X } from 'lucide-react';

export default function Dashboard() {
  const { data: stats } = useAppAdminStats();
  const { data: lowStockProducts } = useAppLowStockProducts();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const showBanner = !bannerDismissed && lowStockProducts && lowStockProducts.length > 0;

  return (
    <AdminLayout>
      {showBanner && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 mb-1">Low Stock Alert</p>
            <ul className="space-y-0.5">
              {lowStockProducts.map(p => (
                <li key={p.id} className="text-sm text-amber-700">
                  <span className="font-medium">{p.name}</span>
                  {p.quantity !== null && p.quantity !== undefined && (
                    <> — only <span className="font-bold">{p.quantity} {p.unit}</span> remaining
                      {p.quantityAlert !== null && p.quantityAlert !== undefined && (
                        <span className="text-amber-500"> (alert threshold: {p.quantityAlert} {p.unit})</span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-amber-400 hover:text-amber-600 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.revenue.toFixed(2) || 0} EGP</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="bg-card border border-border p-8 rounded-3xl min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Select an option from the sidebar to manage the store.</p>
      </div>
    </AdminLayout>
  );
}
