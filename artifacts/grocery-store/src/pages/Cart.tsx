import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useStore } from '@/store';
import { useTranslation } from '@/lib/i18n';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';

export default function Cart() {
  const { t, lang } = useTranslation();
  const cart = useStore(s => s.cart);
  const updateQty = useStore(s => s.updateQuantity);
  const remove = useStore(s => s.removeFromCart);
  const total = useStore(s => s.getCartTotal());

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-display font-bold mb-8">{t('cart')}</h1>

        {cart.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-3xl p-12 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 text-4xl">🛒</div>
            <h2 className="text-2xl font-bold mb-2">{t('emptyCart')}</h2>
            <Link href="/shop"><Button className="mt-6 rounded-full px-8">{t('startShopping')}</Button></Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-24 h-24 bg-muted/30 rounded-xl p-2 shrink-0">
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-contain" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate">{lang === 'ar' ? item.nameAr : item.name}</h3>
                    <p className="text-muted-foreground">{item.price} EGP / {t('unitLabel')(item.unit)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="flex items-center border border-border rounded-lg h-10 bg-background">
                      <button className="w-10 h-full flex items-center justify-center hover:bg-muted text-muted-foreground" onClick={() => updateQty(item.id, item.cartQuantity - 1)}>
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-semibold text-sm">{item.cartQuantity}</span>
                      <button className="w-10 h-full flex items-center justify-center hover:bg-muted text-muted-foreground" onClick={() => updateQty(item.id, item.cartQuantity + 1)}>
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button onClick={() => remove(item.id)} className="text-xs text-destructive flex items-center hover:underline">
                      <Trash2 className="w-3 h-3 me-1" /> {t('remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full lg:w-80 shrink-0">
              <div className="bg-card border border-border/50 rounded-3xl p-6 sticky top-24 shadow-lg shadow-black/5">
                <h3 className="font-bold text-xl mb-6">{t('orderSummary')}</h3>
                <div className="space-y-3 mb-6 pb-6 border-b border-border/50">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('subtotal')}</span>
                    <span>{total.toFixed(2)} EGP</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('delivery')}</span>
                    <span className="text-primary font-medium">{t('free')}</span>
                  </div>
                </div>
                <div className="flex justify-between text-2xl font-bold mb-8">
                  <span>{t('total')}</span>
                  <span>{total.toFixed(2)} EGP</span>
                </div>
                <Link href="/checkout">
                  <Button size="lg" className="w-full rounded-xl h-14 text-lg font-bold shadow-lg shadow-primary/20">
                    {t('checkout')} <ArrowRight className="ms-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
