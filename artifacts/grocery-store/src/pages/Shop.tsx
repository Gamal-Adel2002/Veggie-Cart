import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppCategories, useAppProducts } from '@/hooks/use-auth-api';
import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Shop() {
  const { t, lang } = useTranslation();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<number | null>(null);

  const { data: categories } = useAppCategories();
  const { data: products, isLoading } = useAppProducts({
    search: search || undefined,
    categoryId: activeCat || undefined
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 rounded-xl border-border/60 bg-card h-12 shadow-sm"
              placeholder={t('searchVegetables')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
            <h3 className="font-display font-bold text-lg mb-4">{t('categories')}</h3>
            <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
              <Badge
                variant={activeCat === null ? 'default' : 'outline'}
                className="cursor-pointer py-2 px-4 rounded-xl text-sm justify-start hover:bg-primary/10 transition-colors"
                onClick={() => setActiveCat(null)}
              >
                {t('allProducts')}
              </Badge>
              {categories?.map(cat => (
                <Badge
                  key={cat.id}
                  variant={activeCat === cat.id ? 'default' : 'outline'}
                  className="cursor-pointer py-2 px-4 rounded-xl text-sm justify-start hover:bg-primary/10 transition-colors whitespace-nowrap"
                  onClick={() => setActiveCat(cat.id)}
                >
                  <span className="me-2">{cat.icon}</span>
                  {lang === 'ar' ? cat.nameAr : cat.name}
                </Badge>
              ))}
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : products?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-muted/30 rounded-3xl border border-dashed border-border">
              <div className="text-6xl mb-4 opacity-50">🥬</div>
              <h3 className="text-xl font-bold text-foreground">{t('noProductsFound')}</h3>
              <p className="text-muted-foreground mt-2">{t('adjustFilters')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products?.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
