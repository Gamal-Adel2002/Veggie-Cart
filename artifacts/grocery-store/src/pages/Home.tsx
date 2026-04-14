import React, { useRef, useMemo } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppCategories, useAppProducts } from '@/hooks/use-auth-api';
import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { CircleNotch, ArrowRight, ShieldCheck, Clock, Leaf } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import Garden3D from '@/components/home/Garden3D';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
};

const fadeUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

export default function Home() {
  const { t, lang } = useTranslation();
  const { data: categories, isLoading: catLoading } = useAppCategories();
  const { data: products, isLoading: prodLoading } = useAppProducts();

  const heroRef = useRef<HTMLElement>(null);

  const trustBadges = [
    { icon: Leaf, label: t('farmFreshDaily') },
    { icon: ShieldCheck, label: t('topRated') },
    { icon: Clock, label: t('easyCheckout') },
  ];

  const productsByCategory = useMemo(() => {
    if (!products || !categories) return [];
    return categories
      .map(cat => ({
        cat,
        items: products.filter(p => p.categoryId === cat.id),
      }))
      .filter(group => group.items.length > 0);
  }, [products, categories]);

  const uncategorized = useMemo(() => {
    if (!products) return [];
    return products.filter(p => !p.categoryId);
  }, [products]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section ref={heroRef} className="relative min-h-[560px] lg:min-h-[660px] flex items-center overflow-hidden">
          <Garden3D />
        </section>

        {/* ── Trust ribbon ──────────────────────────────────────────── */}
        <section className="py-4 border-b border-border/40 bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-center md:justify-between gap-4">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-muted-foreground">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" weight="fill" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Categories ────────────────────────────────────────────── */}
        <section className="py-10 sm:py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-6 sm:mb-12">
              <div>
                <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-2">
                  {t('explore')}
                </p>
                <h2
                  className="text-2xl sm:text-4xl font-bold text-foreground leading-tight"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {t('categories')}
                </h2>
              </div>
              <Link href="/shop">
                <span className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:text-primary/80 transition-colors group">
                  {t('viewAll')}
                  <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${lang === 'ar' ? 'rotate-180' : ''}`} weight="bold" />
                </span>
              </Link>
            </div>

            {catLoading ? (
              <div className="flex justify-center py-16">
                <CircleNotch className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
              >
                {categories?.map((cat) => (
                  <motion.div key={cat.id} variants={fadeUp}>
                    <Link href={`/shop?category=${cat.id}`}>
                      <div className="group cursor-pointer flex flex-col items-center gap-3 p-5 rounded-xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                        <div className="w-14 h-14 rounded-xl bg-primary/6 flex items-center justify-center text-3xl group-hover:bg-primary/12 group-hover:scale-110 transition-all duration-200">
                          {cat.icon}
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
                            {lang === 'ar' ? cat.nameAr : cat.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{cat.productCount} {t('items')}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* ── Products by category ───────────────────────────────────── */}
        {prodLoading ? (
          <section className="py-10 sm:py-20 bg-muted/25 border-t border-border/40">
            <div className="flex justify-center py-16">
              <CircleNotch className="w-8 h-8 animate-spin text-primary" />
            </div>
          </section>
        ) : (
          <>
            {productsByCategory.map(({ cat, items }, sectionIdx) => (
              <section
                key={cat.id}
                className={`py-10 sm:py-16 border-t border-border/40 ${sectionIdx % 2 === 0 ? 'bg-muted/25' : 'bg-background'}`}
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-end justify-between mb-6 sm:mb-10">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{cat.icon}</span>
                      <div>
                        <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-1">
                          {items.length} {t('items')}
                        </p>
                        <h2
                          className="text-xl sm:text-2xl font-bold text-foreground"
                          style={{ fontFamily: 'var(--font-serif)' }}
                        >
                          {lang === 'ar' ? cat.nameAr : cat.name}
                        </h2>
                      </div>
                    </div>
                    <Link href={`/shop?category=${cat.id}`}>
                      <span className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:text-primary/80 transition-colors group">
                        {t('viewAll')}
                        <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${lang === 'ar' ? 'rotate-180' : ''}`} weight="bold" />
                      </span>
                    </Link>
                  </div>

                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                  >
                    {items.map((product) => (
                      <motion.div key={product.id} variants={fadeUp}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </section>
            ))}

            {uncategorized.length > 0 && (
              <section className="py-10 sm:py-16 border-t border-border/40 bg-muted/25">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="mb-6 sm:mb-10">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
                      {t('featuredProducts')}
                    </h2>
                  </div>
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-60px' }}
                    className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                  >
                    {uncategorized.map((product) => (
                      <motion.div key={product.id} variants={fadeUp}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
