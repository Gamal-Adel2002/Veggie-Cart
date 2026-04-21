import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useRoute, Link } from 'wouter';
import { useAppOrder } from '@/hooks/use-auth-api';
import { CheckCircle, Package, MapPin, CircleNotch, ArrowRight } from '@phosphor-icons/react';
import { useTranslation } from '@/lib/i18n';
import { motion } from 'framer-motion';

export default function OrderConfirmation() {
  const [, params] = useRoute('/order-confirmed/:id');
  const id = Number(params?.id);
  const { data: order, isLoading } = useAppOrder(id);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {isLoading ? (
          <CircleNotch className="w-10 h-10 animate-spin text-primary" />
        ) : !order ? (
          <p className="text-muted-foreground">{t('orderNotFound')}</p>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md bg-card border border-border/40 rounded-xl p-8 sm:p-12 text-center shadow-lg"
          >
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.2 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'hsl(149 60% 26% / 0.10)' }}
            >
              <CheckCircle className="w-10 h-10 text-primary" weight="fill" />
            </motion.div>

            <h1
              className="text-3xl font-bold mb-2"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {t('orderConfirmed')}
            </h1>
            <p className="text-muted-foreground mb-8 text-sm">{t('orderConfirmedDesc')(order.customerName)}</p>

            {/* Order details card */}
            <div className="bg-muted/30 rounded-lg p-5 text-left space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Package className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('orderId')}</p>
                  <p className="font-bold text-sm">#{order.id.toString().padStart(6, '0')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('deliveryTo')}</p>
                  <p className="font-medium text-sm">{order.latitude?.toFixed(4)}, {order.longitude?.toFixed(4)}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border/40 flex justify-between items-center">
                <span className="font-semibold text-sm">{t('totalPaidCash')}</span>
                <span className="text-lg font-bold text-primary">{(order.finalPrice ?? order.totalPrice).toFixed(2)} EGP</span>
              </div>
            </div>

            <Link href="/account">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: 'var(--shadow-gold)' }}
                whileTap={{ scale: 0.97 }}
                className="relative overflow-hidden w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-sm mb-4 btn-gold-shimmer"
              >
                {t('trackOrder')}
                <ArrowRight className="w-4 h-4" weight="bold" />
              </motion.button>
            </Link>
            <Link href="/shop">
              <span className="text-sm text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer">
                {t('continueShopping')}
              </span>
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
