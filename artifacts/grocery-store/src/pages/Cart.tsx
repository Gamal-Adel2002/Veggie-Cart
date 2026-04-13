import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { Minus, Plus, Trash, ArrowRight, ShoppingBag } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

export default function Cart() {
  const { t, lang } = useTranslation();
  const cart = useStore(s => s.cart);
  const updateQty = useStore(s => s.updateQuantity);
  const remove = useStore(s => s.removeFromCart);
  const total = useStore(s => s.getCartTotal());

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-8">
          <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-1.5">{t('shop')}</p>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>
            {t('cart')}
          </h1>
        </div>

        {cart.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/40 rounded-xl p-16 text-center flex flex-col items-center shadow-sm"
          >
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-5 text-4xl">🛒</div>
            <h2 className="text-xl font-bold mb-1.5">{t('emptyCart')}</h2>
            <p className="text-muted-foreground text-sm mb-6">Add items from the shop to get started.</p>
            <Link href="/shop">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-7 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" weight="fill" />
                {t('startShopping')}
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cart items */}
            <div className="flex-1 space-y-3">
              {cart.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-card border border-border/40 rounded-xl p-4 flex items-center gap-4 shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg bg-muted/30 overflow-hidden shrink-0">
                    {item.image
                      ? <img src={item.image} alt={lang === 'ar' ? item.nameAr : item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🥬</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{lang === 'ar' ? item.nameAr : item.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.price} EGP / {t('unitLabel')(item.unit)}</p>
                    <p className="text-sm font-bold text-primary mt-1">{(item.price * item.cartQuantity).toFixed(2)} EGP</p>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex items-center border border-border/50 rounded-lg h-9 bg-background overflow-hidden">
                      <button
                        className="w-9 h-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                        onClick={() => updateQty(item.id, item.cartQuantity - 1)}
                      >
                        <Minus className="w-3 h-3" weight="bold" />
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{item.cartQuantity}</span>
                      <button
                        className="w-9 h-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
                        onClick={() => updateQty(item.id, item.cartQuantity + 1)}
                      >
                        <Plus className="w-3 h-3" weight="bold" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(item.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash className="w-3.5 h-3.5" /> {t('remove')}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order summary */}
            <div className="w-full lg:w-[304px] shrink-0">
              <div className="bg-card border border-border/40 rounded-xl p-6 sticky top-24 shadow-sm">
                <h3 className="font-bold text-lg mb-5 pb-5 border-b border-border/40">{t('orderSummary')}</h3>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('subtotal')}</span>
                    <span className="font-medium">{total.toFixed(2)} EGP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('delivery')}</span>
                    <span className="text-primary font-medium">{t('free')}</span>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-xl pt-4 border-t border-border/40 mb-6">
                  <span>{t('total')}</span>
                  <span>{total.toFixed(2)} EGP</span>
                </div>

                <Link href="/checkout">
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: 'var(--shadow-gold)' }}
                    whileTap={{ scale: 0.97 }}
                    className="relative overflow-hidden w-full flex items-center justify-center gap-2.5 h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base shadow-sm btn-gold-shimmer transition-all duration-200"
                  >
                    {t('checkout')}
                    <ArrowRight className="w-4 h-4" weight="bold" />
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
