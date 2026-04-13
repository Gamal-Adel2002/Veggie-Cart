import React from 'react';
import { Link } from 'wouter';
import { Plus, ShoppingBag } from '@phosphor-icons/react';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import type { Product } from '@workspace/api-client-react';

export function ProductCard({ product }: { product: Product }) {
  const { t, lang } = useTranslation();
  const addToCart = useStore(s => s.addToCart);
  const { toast } = useToast();

  const isOutOfStock = !product.inStock || (product.quantity !== null && product.quantity !== undefined && product.quantity <= 0);
  const name = lang === 'ar' ? product.nameAr : product.name;
  const categoryName = product.category ? (lang === 'ar' ? product.category.nameAr : product.category.name) : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
    toast({
      title: t('addedToCart'),
      description: t('addedToCartDesc')(1, name)
    });
  };

  return (
    <Link href={`/product/${product.id}`}>
      <div className="group cursor-pointer h-full flex flex-col bg-card border border-border/40 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/8 hover:border-primary/20">

        {/* Image area */}
        <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
          {product.image ? (
            <img
              src={product.image}
              alt={name}
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out ${
                isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-105'
              }`}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40">
              <ShoppingBag className="w-10 h-10 mb-1" weight="thin" />
              <span className="text-xs">{t('noImage')}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Status badge */}
          {isOutOfStock ? (
            <span className="absolute top-2.5 start-2.5 bg-destructive/90 text-destructive-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm">
              {t('outOfStock')}
            </span>
          ) : product.featured ? (
            <span className="absolute top-2.5 start-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm"
              style={{ background: 'hsl(36 63% 55%)', color: '#fff' }}>
              {t('featured')}
            </span>
          ) : null}

          {/* Category on hover */}
          {categoryName && (
            <span className="absolute top-2.5 end-2.5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 bg-background/90 text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-sm uppercase tracking-wide">
              {categoryName}
            </span>
          )}

          {/* Price tag — always visible, bottom right */}
          <div className="absolute bottom-2.5 end-2.5">
            <span className="inline-flex items-baseline gap-1 bg-background/95 dark:bg-card/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm border border-border/20 text-foreground font-bold text-sm">
              {product.price}
              <span className="text-[10px] text-muted-foreground font-normal">EGP</span>
            </span>
          </div>

          {/* Add to cart — slides up on hover */}
          {!isOutOfStock && (
            <div className="absolute inset-x-2.5 bottom-2.5 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 ease-out">
              <motion.button
                onClick={handleAdd}
                whileTap={{ scale: 0.97 }}
                className="w-full relative overflow-hidden flex items-center justify-center gap-2 font-semibold text-sm py-2.5 rounded-lg shadow-md text-white btn-gold-shimmer transition-all duration-150"
                style={{ background: 'hsl(149 60% 26%)' }}
              >
                <Plus className="w-4 h-4" weight="bold" />
                {t('addToCart')}
              </motion.button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5 flex-1 flex flex-col gap-0.5">
          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground mt-auto pt-1">
            {t('unitLabel')(product.unit)}
          </p>
        </div>
      </div>
    </Link>
  );
}
