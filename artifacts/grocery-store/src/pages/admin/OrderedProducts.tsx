import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppOrderedProducts } from '@/hooks/use-auth-api';
import { ClipboardList } from 'lucide-react';

export default function OrderedProducts() {
  const { data: categories, isLoading } = useAppOrderedProducts();

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Order's Products
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregated product quantities from all active orders (waiting, accepted, preparing)
        </p>
      </div>

      {isLoading && (
        <div className="text-center py-16 text-muted-foreground">Loading…</div>
      )}

      {!isLoading && (!categories || categories.length === 0) && (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No active order products</p>
          <p className="text-sm mt-1">Products from waiting, accepted, and preparing orders will appear here.</p>
        </div>
      )}

      {!isLoading && categories && categories.length > 0 && (
        <div className="grid gap-5">
          {categories.map((cat) => (
            <div
              key={cat.categoryName}
              className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
                <span className="text-2xl leading-none">{cat.categoryIcon}</span>
                <div>
                  <h3 className="font-semibold text-foreground">{cat.categoryName}</h3>
                  <p className="text-xs text-muted-foreground" dir="rtl">{cat.categoryNameAr}</p>
                </div>
                <span className="ms-auto text-xs text-muted-foreground font-medium">
                  {cat.products.length} product{cat.products.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-border">
                {cat.products.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                    <div>
                      <span className="font-medium text-foreground">{product.productName}</span>
                      <span className="ms-2 text-sm text-muted-foreground" dir="rtl">{product.productNameAr}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{product.totalQuantity}</span>
                      <span className="text-sm text-muted-foreground">{product.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
