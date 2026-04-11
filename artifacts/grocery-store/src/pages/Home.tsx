import React, { useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppCategories, useAppProducts } from '@/hooks/use-auth-api';
import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Leaf, CircleNotch, ShoppingBag, Truck, Star } from '@phosphor-icons/react';
import { motion, useScroll, useTransform } from 'framer-motion';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
};

const fadeUp = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }
};

export default function Home() {
  const { t, lang } = useTranslation();
  const { data: categories, isLoading: catLoading } = useAppCategories();
  const { data: products, isLoading: prodLoading } = useAppProducts({ featured: true });

  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 500], ['0%', '18%']);
  const bgOpacity = useTransform(scrollY, [0, 350], [1, 0.7]);
  const floatY = useTransform(scrollY, [0, 500], ['0%', '-12%']);

  const trustBadges = [
    { icon: Leaf,        label: t('farmFreshDaily') },
    { icon: Truck,       label: t('freeDelivery')   },
    { icon: Star,        label: t('topRated')       },
    { icon: ShoppingBag, label: t('easyCheckout')   },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* ── Hero Banner ── */}
        <section ref={heroRef} className="relative min-h-[520px] lg:min-h-[620px] flex items-center overflow-hidden">
          {/* Animated gradient background — parallax layer */}
          <motion.div
            className="absolute inset-0 hero-animated-bg"
            style={{ y: bgY, opacity: bgOpacity, scale: 1.1 }}
          />

          {/* Decorative floating shapes — parallax layer (moves less than scroll) */}
          <motion.div
            className="absolute inset-0 overflow-hidden pointer-events-none select-none"
            style={{ y: floatY }}
          >
            <div className="float-slow absolute -top-8 -end-8 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
            <div className="float-med absolute bottom-8 start-1/4 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
            <div className="float-slow absolute top-1/3 end-1/4 w-32 h-32 rounded-full bg-emerald-300/10 blur-xl" />
            <span className="float-slow absolute top-10 end-16 text-7xl lg:text-9xl opacity-20 select-none">🥦</span>
            <span className="float-med absolute bottom-12 end-1/3 text-5xl lg:text-7xl opacity-15 select-none">🥬</span>
            <span className="float-slow absolute top-1/2 end-8 text-4xl opacity-10 select-none">🌿</span>
          </motion.div>

          {/* Dark gradient on left so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 w-full">
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className="max-w-2xl"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white font-semibold text-sm mb-6">
                <Leaf className="w-4 h-4" weight="fill" />
                {t('farmFreshDaily')}
              </motion.div>

              <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-display font-extrabold text-white leading-[1.05] mb-6">
                {t('heroTitle1')}<br />
                <span className="text-emerald-300">{t('heroTitle2')}</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-lg text-white/75 mb-10 max-w-lg leading-relaxed">
                {t('heroSubtitle')}
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
                <Link href="/shop">
                  <Button
                    size="lg"
                    className="rounded-full text-base px-8 h-14 bg-white text-primary font-bold shadow-2xl shadow-black/30 hover:bg-white/90 hover:-translate-y-1 transition-all duration-300 gap-2"
                  >
                    {t('startShopping')}
                    <ArrowRight className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} weight="bold" />
                  </Button>
                </Link>
                <Link href="/shop">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="rounded-full h-14 px-8 text-white hover:bg-white/10 border border-white/30 font-semibold text-base"
                  >
                    {t('viewAll')}
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Trust Badges ── */}
        <section className="bg-primary py-5 border-b border-primary-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-primary-foreground/90">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" weight="fill" />
                  </div>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-1">{t('explore')}</p>
                <h2 className="text-3xl font-display font-bold text-foreground">{t('categories')}</h2>
              </div>
              <Link href="/shop" className="text-primary font-semibold text-sm hover:underline">
                {t('viewAll')} →
              </Link>
            </div>

            {catLoading ? (
              <div className="flex justify-center py-12">
                <CircleNotch className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                {categories?.map((cat, i) => (
                  <Link key={cat.id} href={`/shop?category=${cat.id}`}>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="bg-card border border-border/50 rounded-3xl p-6 text-center hover:border-primary/40 hover:shadow-xl hover:shadow-primary/8 cursor-pointer transition-all duration-300 group hover:-translate-y-1"
                    >
                      <div className="w-16 h-16 mx-auto bg-primary/5 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                        {cat.icon}
                      </div>
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                        {lang === 'ar' ? cat.nameAr : cat.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{cat.productCount} {t('items')}</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Featured Products ── */}
        <section className="py-20 bg-muted/30 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-1">{t('handpicked')}</p>
                <h2 className="text-3xl font-display font-bold text-foreground">{t('featuredProducts')}</h2>
              </div>
              <Link href="/shop" className="text-primary font-semibold text-sm hover:underline">
                {t('viewAll')} →
              </Link>
            </div>

            {prodLoading ? (
              <div className="flex justify-center py-12">
                <CircleNotch className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products?.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ y: 24, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
