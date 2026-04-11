import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppCategories, useAppProducts } from '@/hooks/use-auth-api';
import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { MagnifyingGlass, CircleNotch, Funnel } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 space-y-5">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlass className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" weight="bold" />
            <Input
              className="ps-9 rounded-xl border-border/60 bg-card h-12 shadow-sm focus-visible:ring-primary/40"
              placeholder={t('searchVegetables')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Categories */}
          <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Funnel className="w-4 h-4 text-primary" weight="fill" />
              <h3 className="font-display font-bold text-base">{t('categories')}</h3>
            </div>
            <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
              <Badge
                variant={activeCat === null ? 'default' : 'outline'}
                className="cursor-pointer py-2 px-4 rounded-xl text-sm justify-start hover:bg-primary/10 transition-colors shrink-0"
                onClick={() => setActiveCat(null)}
              >
                {t('allProducts')}
              </Badge>
              {categories?.map(cat => (
                <Badge
                  key={cat.id}
                  variant={activeCat === cat.id ? 'default' : 'outline'}
                  className="cursor-pointer py-2 px-4 rounded-xl text-sm justify-start hover:bg-primary/10 transition-colors whitespace-nowrap shrink-0"
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {activeCat
                ? categories?.find(c => c.id === activeCat)
                  ? `${categories.find(c => c.id === activeCat)!.icon} ${lang === 'ar' ? categories.find(c => c.id === activeCat)!.nameAr : categories.find(c => c.id === activeCat)!.name}`
                  : t('shop')
                : t('shop')}
            </h1>
            {products && !isLoading && (
              <span className="text-sm text-muted-foreground font-medium">
                {products.length} {t('items')}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <CircleNotch className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : products?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-muted/30 rounded-3xl border border-dashed border-border">
              <div className="text-6xl mb-4 opacity-50">🥬</div>
              <h3 className="text-xl font-bold text-foreground">{t('noProductsFound')}</h3>
              <p className="text-muted-foreground mt-2">{t('adjustFilters')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products?.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
