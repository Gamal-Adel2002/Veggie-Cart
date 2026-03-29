import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppCategories, useAppProducts } from '@/hooks/use-auth-api';
import { ProductCard } from '@/components/ProductCard';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowRight, Leaf, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { t, lang } = useTranslation();
  const { data: categories, isLoading: catLoading } = useAppCategories();
  const { data: products, isLoading: prodLoading } = useAppProducts({ featured: true });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-12 pb-24 overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* landing page hero scenic vegetable fresh food photography */}
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
              alt="Fresh vegetables"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent dark:from-background/95 dark:via-background/90" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-16 lg:pt-32">
            <motion.div 
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-sm mb-6">
                <Leaf className="w-4 h-4" /> Farm Fresh Daily
              </div>
              <h1 className="text-5xl lg:text-7xl font-display font-extrabold text-foreground leading-[1.1] mb-6">
                Fresh Greens,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Delivered</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
                Skip the lines. Get farm-fresh vegetables and fruits delivered straight to your door in 45 minutes or less.
              </p>
              <Link href="/shop">
                <Button size="lg" className="rounded-full text-base px-8 h-14 shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-300">
                  {t('startShopping')} <ArrowRight className={`ms-2 w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <h2 className="text-3xl font-display font-bold text-foreground">{t('categories')}</h2>
            </div>
            
            {catLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                {categories?.map((cat, i) => (
                  <Link key={cat.id} href={`/shop?category=${cat.id}`}>
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-card border border-border/50 rounded-3xl p-6 text-center hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 cursor-pointer transition-all duration-300 group"
                    >
                      <div className="w-16 h-16 mx-auto bg-primary/5 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
                        {cat.icon}
                      </div>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {lang === 'ar' ? cat.nameAr : cat.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{cat.productCount} items</p>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-20 bg-muted/30 border-t border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-10">
              <h2 className="text-3xl font-display font-bold text-foreground">{t('featuredProducts')}</h2>
              <Link href="/shop" className="text-primary font-semibold hover:underline">
                View All
              </Link>
            </div>
            
            {prodLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products?.map((product, i) => (
                  <motion.div 
                    key={product.id}
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
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
