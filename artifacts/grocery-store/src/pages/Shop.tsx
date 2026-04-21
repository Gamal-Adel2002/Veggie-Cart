import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppCategories, useAppProducts } from '@/hooks/use-auth-api';
import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/lib/i18n';
import { CircleNotch, MagnifyingGlass } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { useSearch } from 'wouter';

function isArabicText(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

export default function Shop() {
  const { t, lang } = useTranslation();
  const qs = useSearch();
  const urlSearch = new URLSearchParams(qs).get('search') ?? '';
  const [search, setSearch] = useState(urlSearch);
  const [activeCat, setActiveCat] = useState<number | null>(null);

  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const { data: categories } = useAppCategories();
  const { data: products, isLoading } = useAppProducts({
    search: search || undefined,
    categoryId: activeCat || undefined
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-8">
          <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-2">
            {t('explore')}
          </p>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
            {activeCat
              ? categories?.find(c => c.id === activeCat)
                ? `${categories.find(c => c.id === activeCat)!.icon} ${lang === 'ar' ? categories.find(c => c.id === activeCat)!.nameAr : categories.find(c => c.id === activeCat)!.name}`
                : t('shop')
              : t('shop')}
          </h1>
        </div>

        {/* Search bar — full width */}
        <div className="relative mb-6">
          <MagnifyingGlass className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" weight="bold" />
          <input
            className="w-full ps-10 pe-4 h-11 rounded-lg border border-border/60 bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-sm"
            placeholder={t('searchVegetables')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir={isArabicText(search) ? 'rtl' : 'ltr'}
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCat(null)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
              activeCat === null
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-primary'
            }`}
          >
            {t('allProducts')}
          </button>
          {categories?.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                activeCat === cat.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border/50 hover:border-primary/30 hover:text-primary'
              }`}
            >
              <span>{cat.icon}</span>
              {lang === 'ar' ? cat.nameAr : cat.name}
            </button>
          ))}
        </div>

        {/* Results count */}
        {products && !isLoading && (
          <p className="text-sm text-muted-foreground mb-5">
            {products.length} {t('items')}
          </p>
        )}

        {/* Products grid */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <CircleNotch className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : products?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center bg-muted/30 rounded-xl border border-dashed border-border">
            <div className="text-5xl mb-4 opacity-40">🥬</div>
            <h3 className="text-lg font-bold text-foreground">{t('noProductsFound')}</h3>
            <p className="text-muted-foreground mt-1.5 text-sm">{t('adjustFilters')}</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
          >
            {products?.map((product) => (
              <motion.div
                key={product.id}
                variants={{ hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
