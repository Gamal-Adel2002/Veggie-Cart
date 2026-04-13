import React, { useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppCategories, useAppProducts } from '@/hooks/use-auth-api';
import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { CircleNotch, ArrowRight, ShieldCheck, Clock, Leaf } from '@phosphor-icons/react';
import { motion, useScroll, useTransform } from 'framer-motion';
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
  const { data: products, isLoading: prodLoading } = useAppProducts({ featured: true });

  const heroRef = useRef<HTMLElement>(null);

  const trustBadges = [
    { icon: Leaf, label: t('farmFreshDaily') },
    { icon: ShieldCheck, label: t('topRated') },
    { icon: Clock, label: t('easyCheckout') },
  ];

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
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-2">
                  {t('explore')}
                </p>
                <h2
                  className="text-4xl font-bold text-foreground leading-tight"
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

        {/* ── Featured products ──────────────────────────────────────── */}
        <section className="py-20 bg-muted/25 border-t border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-2">
                  {t('handpicked')}
                </p>
                <h2
                  className="text-4xl font-bold text-foreground leading-tight"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {t('featuredProducts')}
                </h2>
              </div>
              <Link href="/shop">
                <span className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:text-primary/80 transition-colors group">
                  {t('viewAll')}
                  <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${lang === 'ar' ? 'rotate-180' : ''}`} weight="bold" />
                </span>
              </Link>
            </div>

            {prodLoading ? (
              <div className="flex justify-center py-16">
                <CircleNotch className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <motion.div
                variants={stagger}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {products?.map((product) => (
                  <motion.div key={product.id} variants={fadeUp}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
