import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppProduct } from '@/hooks/use-auth-api';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useRoute } from 'wouter';
import { CircleNotch, Minus, Plus, ShoppingCart, ArrowLeft } from '@phosphor-icons/react';
import { useStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function ProductDetail() {
  const [, params] = useRoute('/product/:id');
  const id = Number(params?.id);
  const { data: product, isLoading } = useAppProduct(id);
  const { t, lang } = useTranslation();
  const addToCart = useStore(s => s.addToCart);
  const [qty, setQty] = useState(1);
  const { toast } = useToast();

  if (isLoading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <CircleNotch className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );
  if (!product) return <div>{t('productNotFound')}</div>;

  const name = lang === 'ar' ? product.nameAr : product.name;
  const description = lang === 'ar' ? product.descriptionAr : product.description;
  const categoryName = lang === 'ar' ? product.category?.nameAr : product.category?.name;

  const isOutOfStock = !product.inStock || (product.quantity !== null && product.quantity !== undefined && product.quantity <= 0);

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart(product, qty);
    toast({ title: t('addedToCart'), description: t('addedToCartDesc')(qty, name) });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back')}
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card rounded-xl border border-border/40 shadow-md overflow-hidden flex flex-col md:flex-row"
        >
          {/* Image panel */}
          <div className="md:w-[45%] bg-muted/20 flex items-center justify-center relative min-h-[280px] overflow-hidden">
            {product.image ? (
              <img
                src={product.image}
                alt={name}
                className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center text-muted-foreground text-sm">
                {t('noImage')}
              </div>
            )}
            {isOutOfStock ? (
              <span className="absolute top-5 start-5 bg-destructive text-destructive-foreground text-xs font-semibold px-3 py-1 rounded-lg">
                {t('outOfStock')}
              </span>
            ) : product.featured ? (
              <span
                className="absolute top-5 start-5 text-white text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ background: 'hsl(36 63% 55%)' }}
              >
                {t('featured')}
              </span>
            ) : null}
          </div>

          {/* Info panel */}
          <div className="md:w-[55%] p-8 md:p-12 flex flex-col">
            {categoryName && (
              <span className="inline-flex text-xs font-semibold text-primary bg-primary/8 border border-primary/15 px-2.5 py-0.5 rounded-md w-fit mb-4">
                {categoryName}
              </span>
            )}

            <h1
              className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {name}
            </h1>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-3xl font-bold text-primary">{product.price}</span>
              <span className="text-sm text-muted-foreground">EGP / {t('unitLabel')(product.unit)}</span>
            </div>

            <p className="text-muted-foreground text-base leading-relaxed mb-8 border-t border-border/40 pt-6">
              {description || t('freshDefault')}
            </p>

            {isOutOfStock ? (
              <button
                disabled
                className="mt-auto h-12 w-full rounded-lg bg-muted text-muted-foreground text-base font-semibold cursor-not-allowed opacity-60"
              >
                {t('outOfStock')}
              </button>
            ) : (
              <div className="mt-auto flex flex-col sm:flex-row gap-4">
                {/* Qty control */}
                <div className="flex items-center border border-border/60 rounded-lg h-12 bg-background px-1.5 w-full sm:w-36">
                  <button
                    className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                  >
                    <Minus className="w-4 h-4" weight="bold" />
                  </button>
                  <span className="flex-1 text-center font-bold text-lg">{qty}</span>
                  <button
                    className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    onClick={() => setQty(qty + 1)}
                  >
                    <Plus className="w-4 h-4" weight="bold" />
                  </button>
                </div>

                {/* Add to cart */}
                <motion.button
                  onClick={handleAdd}
                  whileHover={{ scale: 1.02, boxShadow: 'var(--shadow-gold)' }}
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden flex-1 h-12 rounded-lg font-semibold text-base text-white flex items-center justify-center gap-2.5 btn-gold-shimmer transition-all duration-200"
                  style={{ background: 'hsl(149 60% 26%)' }}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {t('addToCart')}
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
